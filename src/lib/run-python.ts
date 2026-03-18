/**
 * Run a Python script with given inputs using Pyodide (WebAssembly).
 * Injects IN as a list (IN[0], IN[1], ...) and expects the script to set OUT.
 * No system Python required; runs in-process.
 * Only used on server (API routes); pyodide is in serverExternalPackages.
 */
import path from "path";
import { loadPyodide } from "pyodide";

type PyodideAPI = {
  globals: { set: (k: string, v: unknown) => void; get: (k: string) => unknown };
  runPythonAsync: (code: string) => Promise<unknown>;
};

let pyodideInstance: PyodideAPI | null = null;

async function getPyodide(): Promise<PyodideAPI> {
  if (pyodideInstance) return pyodideInstance;
  const indexURL = path.join(process.cwd(), "node_modules", "pyodide");
  pyodideInstance = (await loadPyodide({ indexURL })) as unknown as PyodideAPI;
  return pyodideInstance;
}

const dictConverter = (entries: [string, unknown][]) =>
  Object.fromEntries(entries.map(([k, v]) => [k, toJs(v)]));

/** Convert Pyodide proxy to plain JS so OUT.result, OUT["result"] work. Default dict→Map breaks path lookup. */
function toJs(value: unknown): unknown {
  if (value == null) return value;
  const proxy = value as { toJs?: (opts?: { dict_converter?: (e: [string, unknown][]) => unknown }) => unknown };
  if (typeof proxy.toJs === "function") {
    return proxy.toJs({ dict_converter: dictConverter });
  }
  return value;
}

export async function runPythonScript(
  code: string,
  inputValues: unknown[],
): Promise<unknown> {
  const pyodide = await getPyodide();
  try {
    pyodide.globals.set("IN", inputValues);
    pyodide.globals.set("_code", code);
    await pyodide.runPythonAsync("OUT = None\nexec(_code)");
    const out = pyodide.globals.get("OUT");
    return toJs(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}
