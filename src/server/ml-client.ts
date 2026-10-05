import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ML_PORT = process.env.ML_PORT || "8765";
// Set ML_SERVICE_URL to use an externally-managed service instead of the auto-spawned one.
const EXTERNAL_URL = process.env.ML_SERVICE_URL;
const ML_URL = EXTERNAL_URL || `http://127.0.0.1:${ML_PORT}`;

let child: ChildProcess | null = null;
let startedAt = 0;
let resolving = false;
let startupFailure: string | null = null; // why the ML service could not be launched (shown in the 503)

// Let PYTHON_EXECUTABLE etc. be set in .env (Node does not read .env on its own).
// Values already present in the real environment are never overridden.
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env"));
} catch {
  // no .env file - fine
}

export class MlUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MlUnavailableError";
  }
}

interface PythonCandidate {
  cmd: string;
  args: string[];
  label: string;
}

/**
 * Ordered list of ways to run Python. Nothing here is trusted until it passes probePython().
 * Windows notes: bare `python` / `python3` frequently resolve to the Microsoft Store alias stub
 * (exit code 9009, "Python was not found"), so the real install paths and the `py` launcher
 * are tried before them.
 */
export function pythonCandidates(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): PythonCandidate[] {
  const list: PythonCandidate[] = [];
  const add = (cmd: string | undefined, args: string[] = [], label = cmd ?? "") => {
    if (cmd && !list.some((c) => c.cmd === cmd && c.args.join(" ") === args.join(" "))) {
      list.push({ cmd, args, label });
    }
  };

  add(env["PYTHON_EXECUTABLE"], [], `PYTHON_EXECUTABLE (${env["PYTHON_EXECUTABLE"]})`);
  add(env["ML_PYTHON"], [], `ML_PYTHON (${env["ML_PYTHON"]})`);

  if (platform === "win32") {
    // This machine's interpreter
    const known = "C:\\Users\\rupa\\AppData\\Local\\Programs\\Python\\Python314\\python.exe";
    if (fs.existsSync(known)) add(known, [], `local Python 3.14 (${known})`);
    // Any per-user install (newest first)
    const root = env["LOCALAPPDATA"] ? path.join(env["LOCALAPPDATA"], "Programs", "Python") : null;
    try {
      if (root) {
        for (const dir of fs.readdirSync(root).filter((d) => /^Python3\d+$/i.test(d)).sort().reverse()) {
          const exe = path.join(root, dir, "python.exe");
          if (fs.existsSync(exe)) add(exe, [], `${dir} (${exe})`);
        }
      }
    } catch {
      // folder missing - ignore
    }
    add("py", ["-3"], "py -3 launcher");
    add("python", [], "python on PATH");
  } else {
    add("python3");
    add("python");
  }
  return list;
}

/** A candidate is accepted only if it is real Python AND can import the ML dependencies. */
function probePython(c: PythonCandidate): Promise<{ ok: true } | { ok: false; reason: string; hasPython: boolean }> {
  return new Promise((resolve) => {
    execFile(
      c.cmd,
      [...c.args, "-c", "import sys, sklearn, pandas, numpy, joblib; print('PY', sys.version.split()[0])"],
      { timeout: 60000, windowsHide: true },
      (err, stdout, stderr) => {
        if (!err && String(stdout).includes("PY ")) return resolve({ ok: true });
        const text = `${stderr || ""}${stdout || ""}`;
        const code = (err as NodeJS.ErrnoException | null)?.code;
        if (code === "ENOENT") return resolve({ ok: false, reason: "not found", hasPython: false });
        if (/Python was not found|Microsoft Store/i.test(text) || Number(code) === 9009)
          return resolve({ ok: false, reason: "Microsoft Store alias stub, not a real Python", hasPython: false });
        if (/ModuleNotFoundError|ImportError/.test(text)) {
          const mod = /No module named '([^']+)'/.exec(text)?.[1];
          return resolve({ ok: false, reason: `Python works but package '${mod ?? "?"}' is missing`, hasPython: true });
        }
        resolve({ ok: false, reason: (text.trim().split("\n").pop() || String(err?.message)).slice(0, 160), hasPython: false });
      },
    );
  });
}

/**
 * Launch ml/service.py next to the Express server (no-op if ML_SERVICE_URL is configured).
 * Never throws and never blocks startup: if no usable Python is found the app keeps running and
 * the prediction API answers 503 with an explanatory message.
 */
export function startMlService() {
  if (EXTERNAL_URL || child || resolving) return;
  resolving = true;
  startedAt = Date.now();
  void launch()
    .catch((err) => console.error("[ml-service] startup failed:", (err as Error).message))
    .finally(() => {
      resolving = false;
    });
}

async function launch() {
  const candidates = pythonCandidates();
  const failures: string[] = [];
  let chosen: PythonCandidate | null = null;
  let installHint: string | null = null;

  for (const c of candidates) {
    const result = await probePython(c);
    if (result.ok) {
      chosen = c;
      break;
    }
    failures.push(`  - ${c.label}: ${result.reason}`);
    if (result.hasPython && !installHint) {
      installHint = `${[c.cmd, ...c.args].map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(" ")} -m pip install -r ml/requirements.txt`;
    }
  }

  if (!chosen) {
    startupFailure = installHint
      ? `Python found but ML packages are missing. Run: ${installHint}`
      : "No usable Python found. Install Python 3 and run: pip install -r ml/requirements.txt (or set PYTHON_EXECUTABLE in .env).";
    console.error(
      `[ml-service] No usable Python found - the app will keep running, but /api/predictions will return 503.\n` +
        `${failures.join("\n")}\n` +
        (installHint
          ? `  Fix: run  ${installHint}\n`
          : `  Fix: install Python 3, then run  pip install -r ml/requirements.txt  and/or set PYTHON_EXECUTABLE in .env\n`),
    );
    return;
  }

  if (failures.length) console.warn(`[ml-service] skipped unusable Python candidates:\n${failures.join("\n")}`);
  console.log(`[ml-service] using Python: ${chosen.label}`);
  startedAt = Date.now();
  const proc = spawn(chosen.cmd, [...chosen.args, path.resolve(process.cwd(), "ml/service.py"), "--port", ML_PORT], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child = proc;
  const log = (buf: Buffer) => {
    for (const line of buf.toString().split("\n")) if (line.trim()) console.log(`[ml-service] ${line}`);
  };
  proc.stdout?.on("data", log);
  proc.stderr?.on("data", log);
  proc.on("error", (err) => {
    console.error(`[ml-service] could not start '${chosen!.label}': ${err.message}`);
    child = null;
  });
  proc.on("exit", (code) => {
    console.warn(`[ml-service] exited (code ${code}). Predictions will return 503 until it is restarted.`);
    child = null;
  });
  const stop = () => proc.kill();
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });
}

async function call(pathname: string, init?: RequestInit): Promise<Response> {
  // While the service is still booting (sklearn import takes a few seconds) retry briefly.
  const booting = () => !EXTERNAL_URL && (resolving || child) && Date.now() - startedAt < 90000;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(`${ML_URL}${pathname}`, { ...init, signal: AbortSignal.timeout(15000) });
    } catch (err) {
      if (booting() && attempt < 150) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new MlUnavailableError(
        `ML prediction service is not reachable at ${ML_URL} (${(err as Error).message}).` +
          (startupFailure ? ` ${startupFailure}` : ""),
      );
    }
  }
}

export interface MlPrediction {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: string[];
  factor_details: { feature: string; value: number | string | null; impact: number }[];
  imputed_features: string[];
}

export async function mlPredict(
  instances: Record<string, unknown>[],
): Promise<{ model_version: string; predictions: MlPrediction[] }> {
  const res = await call("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    model_version: string;
    predictions: MlPrediction[];
  };
  if (!res.ok) throw new Error(body.error || `ML service returned HTTP ${res.status}`);
  return body;
}

export async function mlHealth(): Promise<{ status: string; model_version: string }> {
  const res = await call("/health");
  return (await res.json()) as { status: string; model_version: string };
}
