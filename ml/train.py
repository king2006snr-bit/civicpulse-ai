"""Train the infrastructure risk model from the demo dataset.

Usage:  python3 ml/train.py [--csv path/to/dataset.csv]

Produces ml/artifacts/risk_model.joblib (preprocessing + model in ONE sklearn Pipeline, plus
a background sample used for per-prediction explanations) and ml/artifacts/metrics.json.
"""
from __future__ import annotations

import argparse
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import RidgeCV
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    mean_absolute_error,
    precision_recall_fscore_support,
    r2_score,
)
from sklearn.model_selection import KFold, RepeatedKFold, cross_val_predict, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).parent))
from risk_common import (  # noqa: E402
    CATEGORICAL_FEATURES,
    CONDITION_ORDER,
    FEATURES,
    LEVELS,
    NUMERIC_FEATURES,
    TARGET,
    level_for,
    normalize_condition,
)

ROOT = Path(__file__).parent
DEFAULT_CSV = ROOT / "data" / "infrastructure_risk_ml_demo_dataset.csv"
ARTIFACT = ROOT / "artifacts" / "risk_model.joblib"
METRICS = ROOT / "artifacts" / "metrics.json"
MODEL_VERSION_PREFIX = "gbr"


def build_pipeline(model, scale: bool) -> Pipeline:
    num_steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:  # only the linear model needs scaling
        num_steps.append(("scale", StandardScaler()))
    cond = Pipeline(
        [
            ("ordinal", OrdinalEncoder(categories=[CONDITION_ORDER], handle_unknown="use_encoded_value", unknown_value=np.nan)),
            ("impute", SimpleImputer(strategy="median")),
        ]
    )
    pre = ColumnTransformer(
        [("num", Pipeline(num_steps), NUMERIC_FEATURES), ("cond", cond, CATEGORICAL_FEATURES)]
    )
    return Pipeline([("pre", pre), ("model", model)])


def candidates() -> dict[str, Pipeline]:
    return {
        "ridge": build_pipeline(RidgeCV(alphas=np.logspace(-2, 2, 20)), scale=True),
        "random_forest": build_pipeline(RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=0), scale=False),
        "gradient_boosting": build_pipeline(
            GradientBoostingRegressor(n_estimators=200, max_depth=2, learning_rate=0.05, subsample=0.8, random_state=0),
            scale=False,
        ),
    }


def load(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    missing = [c for c in FEATURES + [TARGET, "risk_level"] if c not in df.columns]
    if missing:
        raise SystemExit(f"Dataset is missing required columns: {missing}")
    df["infrastructure_condition"] = df["infrastructure_condition"].map(normalize_condition)
    for c in NUMERIC_FEATURES:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=[TARGET])
    # Label-convention check: our score->level cutpoints must reproduce every label in the data.
    bad = df[df[TARGET].map(level_for) != df["risk_level"]]
    if len(bad):
        raise SystemExit(f"{len(bad)} rows disagree with the LOW/MEDIUM/HIGH/CRITICAL cutpoints:\n{bad[[TARGET,'risk_level']]}")
    return df


def main() -> None:
    warnings.filterwarnings("ignore")
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(DEFAULT_CSV))
    args = ap.parse_args()

    df = load(Path(args.csv))
    X, y = df[FEATURES], df[TARGET]
    print(f"[train] {len(df)} rows, {len(FEATURES)} features; missing values: {int(X.isna().sum().sum())}")
    print("[train] score->level cutpoints (35/60/80) reproduce all labels in the dataset")

    # 1) Model selection by repeated 5-fold CV
    cv = RepeatedKFold(n_splits=5, n_repeats=5, random_state=42)
    comparison = {}
    for name, pipe in candidates().items():
        r = cross_validate(pipe, X, y, cv=cv, scoring=["neg_mean_absolute_error", "r2"])
        comparison[name] = {"cv_mae": float(-r["test_neg_mean_absolute_error"].mean()), "cv_r2": float(r["test_r2"].mean())}
        print(f"[train] candidate {name:18s} CV MAE {comparison[name]['cv_mae']:.2f}  R2 {comparison[name]['cv_r2']:.3f}")
    best = min(comparison, key=lambda k: comparison[k]["cv_mae"])
    print(f"[train] selected: {best}")

    # 2) Out-of-fold evaluation of the selected model (every row predicted by a model that never saw it)
    oof = np.clip(cross_val_predict(candidates()[best], X, y, cv=KFold(5, shuffle=True, random_state=7)), 0, 100)
    true_lvl = df["risk_level"].tolist()
    pred_lvl = [level_for(s) for s in oof]
    acc = accuracy_score(true_lvl, pred_lvl)
    p, r, f1, sup = precision_recall_fscore_support(true_lvl, pred_lvl, labels=LEVELS, zero_division=0)
    cm = confusion_matrix(true_lvl, pred_lvl, labels=LEVELS)
    off_by_more_than_one = int(sum(abs(LEVELS.index(a) - LEVELS.index(b)) > 1 for a, b in zip(true_lvl, pred_lvl)))
    metrics = {
        "model": best,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": int(len(df)),
        "features": FEATURES,
        "evaluation": "out-of-fold (5-fold CV): each row scored by a model that did not train on it",
        "regression": {"mae": float(mean_absolute_error(y, oof)), "r2": float(r2_score(y, oof))},
        "risk_level": {
            "accuracy": float(acc),
            "per_class": {lv: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f1[i]), "support": int(sup[i])} for i, lv in enumerate(LEVELS)},
            "confusion_matrix": {"labels": LEVELS, "matrix": cm.tolist()},
            "predictions_more_than_one_level_off": off_by_more_than_one,
        },
        "candidate_comparison": comparison,
    }
    print(f"[eval] score MAE {metrics['regression']['mae']:.2f}  R2 {metrics['regression']['r2']:.3f}")
    print(f"[eval] risk-level accuracy {acc:.3f}  (>1 level off: {off_by_more_than_one})")
    print("[eval] per-class:")
    for i, lv in enumerate(LEVELS):
        print(f"         {lv:9s} precision {p[i]:.2f} recall {r[i]:.2f} f1 {f1[i]:.2f} support {int(sup[i])}")
    print("[eval] confusion matrix (rows=true, cols=pred)", LEVELS)
    for lv, row in zip(LEVELS, cm):
        print(f"         {lv:9s} {row.tolist()}")

    # 3) Fit final model on all data and save pipeline + explanation background together
    final = candidates()[best].fit(X, y)
    version = f"{MODEL_VERSION_PREFIX}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    joblib.dump(
        {"pipeline": final, "features": FEATURES, "background": X.sample(min(60, len(X)), random_state=0).reset_index(drop=True), "version": version, "metrics": metrics},
        ARTIFACT,
    )
    metrics["version"] = version
    METRICS.write_text(json.dumps(metrics, indent=2))
    print(f"[train] saved {ARTIFACT.name} ({version}) and {METRICS.name}")


if __name__ == "__main__":
    main()
