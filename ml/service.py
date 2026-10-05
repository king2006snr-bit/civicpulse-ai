"""Local ML prediction service (stdlib HTTP, scikit-learn model).

  GET  /health   -> status + model version
  GET  /model    -> training metrics
  POST /predict  -> {"instances":[{feature: value, ...}, ...]} -> {"predictions":[...]}

Started automatically by server.ts. Binds to 127.0.0.1 only.
Errors are returned as HTTP 4xx/5xx JSON; there is no fallback/random output path.
"""
from __future__ import annotations

import argparse
import json
import sys
import threading
import warnings
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from risk_common import FEATURES, NUMERIC_FEATURES, level_for, normalize_condition, to_float  # noqa: E402

ARTIFACT = Path(__file__).parent / "artifacts" / "risk_model.joblib"
MIN_IMPACT = 2.0  # score points a feature must add before it is reported as a risk factor


def _fmt(v: float) -> str:
    return str(int(round(v))) if abs(v - round(v)) < 1e-9 else f"{v:.1f}"


# Human-readable text for each feature; only used when the model attributes risk to that feature.
FACTOR_TEXT = {
    "complaints_last_7_days": lambda v: f"High number of recent complaints ({_fmt(v)} in the last 7 days)",
    "complaints_last_30_days": lambda v: f"Sustained complaint volume ({_fmt(v)} in the last 30 days)",
    "complaint_count": lambda v: f"High cumulative complaint count ({_fmt(v)})",
    "unresolved_complaints": lambda v: f"Multiple unresolved complaints ({_fmt(v)} open)",
    "previous_incidents": lambda v: f"Previous incidents ({_fmt(v)} recorded)",
    "maintenance_delay_days": lambda v: f"Delayed maintenance ({_fmt(v)} days)",
    "infrastructure_age_years": lambda v: f"Ageing infrastructure ({_fmt(v)} years old)",
    "complaint_severity_1_to_5": lambda v: f"High average complaint severity ({v:.1f}/5)",
}


class RiskModel:
    def __init__(self, path: Path):
        art = joblib.load(path)
        self.pipeline = art["pipeline"]
        self.background: pd.DataFrame = art["background"]
        self.version: str = art["version"]
        self.metrics: dict = art["metrics"]
        self._lock = threading.Lock()

    @staticmethod
    def _frame(instances: list[dict]) -> pd.DataFrame:
        rows = []
        for inst in instances:
            row = {f: to_float(inst.get(f)) for f in NUMERIC_FEATURES}
            row["infrastructure_condition"] = normalize_condition(inst.get("infrastructure_condition"))
            for f in NUMERIC_FEATURES:  # counts/ages cannot be negative
                if not np.isnan(row[f]) and row[f] < 0:
                    row[f] = 0.0
            if not np.isnan(row["complaint_severity_1_to_5"]):
                row["complaint_severity_1_to_5"] = min(5.0, max(1.0, row["complaint_severity_1_to_5"]))
            rows.append(row)
        return pd.DataFrame(rows, columns=FEATURES)

    def _score(self, df: pd.DataFrame) -> np.ndarray:
        return np.clip(self.pipeline.predict(df), 0, 100)

    def predict(self, instances: list[dict]) -> list[dict]:
        df = self._frame(instances)
        with self._lock:
            scores = self._score(df)
            out = []
            for i in range(len(df)):
                out.append(self._one(df.iloc[[i]].reset_index(drop=True), float(scores[i])))
        return out

    def _one(self, row: pd.DataFrame, score: float) -> dict:
        """Per-feature attribution by marginal occlusion: replace one feature at a time with values
        drawn from the training background and measure how far the predicted score falls. The
        drop is that feature's contribution (in score points) to this specific prediction."""
        bg = self.background
        impacts = {}
        for feat in FEATURES:
            probe = pd.concat([row] * len(bg), ignore_index=True)
            probe[feat] = bg[feat].values
            impacts[feat] = score - float(self._score(probe).mean())
        details = []
        for feat, delta in sorted(impacts.items(), key=lambda kv: -kv[1]):
            raw = row.at[0, feat]
            missing = (raw is None) or (isinstance(raw, float) and np.isnan(raw))
            details.append({"feature": feat, "value": None if missing else (raw if feat == "infrastructure_condition" else float(raw)), "impact": round(delta, 1)})
        factors = []
        for d in details:
            if d["impact"] < MIN_IMPACT or d["value"] is None:
                continue  # never explain with a value we had to impute
            if d["feature"] == "infrastructure_condition":
                if d["value"] in ("Poor", "Fair"):
                    factors.append(f"{d['value']} infrastructure condition")
            else:
                factors.append(FACTOR_TEXT[d["feature"]](d["value"]))
            if len(factors) == 5:
                break
        imputed = [d["feature"] for d in details if d["value"] is None]
        return {
            "risk_score": round(score, 1),
            "risk_level": level_for(score),
            "factors": factors,
            "factor_details": details[:6],
            "imputed_features": imputed,
        }


MODEL: RiskModel | None = None


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            return self._send(200, {"status": "ok", "model_version": MODEL.version})
        if self.path == "/model":
            return self._send(200, {"version": MODEL.version, **MODEL.metrics})
        self._send(404, {"error": "not found"})

    def do_POST(self):  # noqa: N802
        if self.path != "/predict":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
            instances = payload.get("instances")
            if not isinstance(instances, list) or not all(isinstance(i, dict) for i in instances):
                return self._send(400, {"error": "body must be {\"instances\": [ {feature: value}, ... ]}"})
            self._send(200, {"model_version": MODEL.version, "predictions": MODEL.predict(instances)})
        except Exception as exc:  # surfaced to the caller; no silent fallback
            self._send(500, {"error": f"prediction failed: {exc}"})

    def log_message(self, fmt, *args):  # quiet
        pass


def main():
    global MODEL
    warnings.filterwarnings("ignore")
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    def retrain(reason: str):
        print(f"[ml] {reason} - training from ml/data ...", flush=True)
        import train  # noqa: WPS433

        sys.argv = [sys.argv[0]]
        train.main()

    if not ARTIFACT.exists():
        retrain("no trained model found")
    try:
        MODEL = RiskModel(ARTIFACT)
    except Exception as exc:  # e.g. artifact saved with an incompatible scikit-learn version
        retrain(f"saved model could not be loaded ({exc})")
        MODEL = RiskModel(ARTIFACT)
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[ml] risk model {MODEL.version} serving on 127.0.0.1:{args.port}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
