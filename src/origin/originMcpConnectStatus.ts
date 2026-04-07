/**
 * Last MCP App.connect() outcome for the debug panel (prod bootstrap only).
 */

type McpConnectStatus = {
  ok: boolean;
  error: string | null;
  at: string | null;
};

let status: McpConnectStatus = {
  ok: false,
  error: null,
  at: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

export function subscribeMcpConnectStatus(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getMcpConnectStatus(): McpConnectStatus {
  return status;
}

export function setMcpConnectResult(ok: boolean, error: string | null) {
  status = {
    ok,
    error,
    at: new Date().toISOString(),
  };
  notify();
}
