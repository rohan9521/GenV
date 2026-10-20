import type { ToolResult } from "../types.js";

const pendingResults = new Map<string, (result: ToolResult) => void>();

export function waitForToolResult(
  id: string,
  timeoutMs = 30_000,
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingResults.delete(id);
      resolve({ ok: false, error: "Client tool execution timed out." });
    }, timeoutMs);

    pendingResults.set(id, (result) => {
      clearTimeout(timeout);
      pendingResults.delete(id);
      resolve(result);
    });
  });
}

export function submitToolResult(id: string, result: ToolResult): boolean {
  const resolve = pendingResults.get(id);
  if (!resolve) return false;
  resolve(result);
  return true;
}
