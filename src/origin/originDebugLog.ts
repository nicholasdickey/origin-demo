/**
 * Ring-buffer debug log for Origin MCP App iframe (ChatVault-style).
 * Mirrors to console with [Origin] prefix for host devtools.
 */

export const ORIGIN_DEBUG_STORAGE_KEY = "origin-debug-enabled";

/** Survives iframe teardown when ChatGPT collapses the MCP panel (same tab session). */
const ORIGIN_DEBUG_LOG_SESSION_KEY = "origin-debug-log-entries";

const MAX_LOGS = 100;

export type OriginDebugLogEntry = {
  timestamp: string;
  message: string;
  data: string | null;
};

const logs: OriginDebugLogEntry[] = [];
const listeners = new Set<() => void>();

function loadPersistedLogs(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(ORIGIN_DEBUG_LOG_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        "timestamp" in item &&
        "message" in item &&
        typeof (item as OriginDebugLogEntry).message === "string"
      ) {
        logs.push({
          timestamp: String((item as OriginDebugLogEntry).timestamp),
          message: String((item as OriginDebugLogEntry).message),
          data:
            "data" in item && (item as OriginDebugLogEntry).data != null
              ? String((item as OriginDebugLogEntry).data)
              : null,
        });
      }
    }
    while (logs.length > MAX_LOGS) logs.shift();
  } catch {
    /* ignore */
  }
}

function persistLogsToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ORIGIN_DEBUG_LOG_SESSION_KEY, JSON.stringify(logs));
  } catch {
    /* quota or private mode */
  }
}

loadPersistedLogs();

function notify() {
  for (const cb of listeners) cb();
}

export function subscribeOriginDebugLogs(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getOriginDebugLogs(): readonly OriginDebugLogEntry[] {
  return logs;
}

export function addLog(message: string, data: unknown = null) {
  const entry: OriginDebugLogEntry = {
    timestamp: new Date().toISOString(),
    message,
    data:
      data !== null && data !== undefined
        ? JSON.stringify(data, null, 2)
        : null,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  persistLogsToStorage();
  console.log(`[Origin] ${message}`, data ?? "");
  notify();
}

export function readOriginDebugEnabledFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ORIGIN_DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function persistOriginDebugEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(ORIGIN_DEBUG_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(ORIGIN_DEBUG_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
