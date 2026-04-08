import { useCallback, useEffect, useMemo, useState } from "react";
import { useOpenAiGlobal } from "../use-openai-global.js";
import {
  addLog,
  getOriginDebugLogs,
  persistOriginDebugEnabled,
  readOriginDebugEnabledFromStorage,
  subscribeOriginDebugLogs,
} from "./originDebugLog.js";
import {
  getMcpConnectStatus,
  subscribeMcpConnectStatus,
} from "./originMcpConnectStatus.js";

export type WidgetLoadSummary = {
  loading: boolean;
  error: string | null;
  surface: string | undefined;
  projectCount: number | undefined;
};

/** Host (McpWidgetHost) injects this so the iframe height tracks content. */
function nudgeHostResize() {
  try {
    const fn = (window as unknown as { mcpWidgetResize?: () => void })
      .mcpWidgetResize;
    fn?.();
  } catch {
    /* ignore */
  }
}

function sliceJson(value: unknown, max = 6000): string {
  try {
    const s = JSON.stringify(value, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}\n… [truncated]`;
  } catch {
    return String(value);
  }
}

function formatLogsForClipboard(
  entries: ReturnType<typeof getOriginDebugLogs>,
): string {
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(`[${e.timestamp}] ${e.message}`);
    if (e.data) lines.push(e.data);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

const btnClass =
  "rounded-md border border-stone-500 bg-stone-800 px-3 py-2 text-[11px] font-medium text-stone-100 hover:bg-stone-700 active:bg-stone-600 dark:border-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700";

export function OriginDebugPanel(props: { widgetLoad: WidgetLoadSummary }) {
  const { widgetLoad } = props;
  const toolInput = useOpenAiGlobal("toolInput");
  const toolOutput = useOpenAiGlobal("toolOutput");
  const toolResponseMetadata = useOpenAiGlobal("toolResponseMetadata");

  const [open, setOpen] = useState(readOriginDebugEnabledFromStorage);
  const [logVersion, setLogVersion] = useState(0);
  const [mcpVersion, setMcpVersion] = useState(0);

  useEffect(() => {
    return subscribeOriginDebugLogs(() => setLogVersion((v) => v + 1));
  }, []);

  useEffect(() => {
    return subscribeMcpConnectStatus(() => setMcpVersion((v) => v + 1));
  }, []);

  const surfaceEnv = import.meta.env.VITE_ORIGIN_SURFACE ?? "(unset)";
  const logEntries = useMemo(
    () => [...getOriginDebugLogs()].reverse(),
    [logVersion],
  );
  const mcpStatus = useMemo(() => getMcpConnectStatus(), [mcpVersion]);

  const stateForCopy = useMemo(
    () => ({
      VITE_ORIGIN_SURFACE: surfaceEnv,
      widgetLoad,
      mcpConnect: mcpStatus,
    }),
    [surfaceEnv, widgetLoad, mcpStatus],
  );

  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        addLog(`Clipboard: copied ${label}`, { bytes: text.length });
      } catch (e) {
        addLog(`Clipboard: copy failed (${label})`, {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [],
  );

  const copyState = useCallback(() => {
    void copyToClipboard(
      JSON.stringify(stateForCopy, null, 2),
      "state",
    );
  }, [copyToClipboard, stateForCopy]);

  const copyLogs = useCallback(() => {
    const newestFirst = [...getOriginDebugLogs()].reverse();
    void copyToClipboard(formatLogsForClipboard(newestFirst), "logs");
  }, [copyToClipboard]);

  const copyAll = useCallback(() => {
    const payload = {
      ...stateForCopy,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      logs: getOriginDebugLogs(),
    };
    void copyToClipboard(JSON.stringify(payload, null, 2), "all");
  }, [
    copyToClipboard,
    stateForCopy,
    toolInput,
    toolOutput,
    toolResponseMetadata,
  ]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      persistOriginDebugEnabled(next);
      addLog("Debug panel toggled", { enabled: next });
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [toggle]);

  useEffect(() => {
    nudgeHostResize();
    const t = window.setTimeout(() => nudgeHostResize(), 100);
    const t2 = window.setTimeout(() => nudgeHostResize(), 400);
    const t3 = window.setTimeout(() => nudgeHostResize(), 800);
    /** When the panel closes, the host iframe often needs extra nudges after layout settles. */
    const collapse =
      !open
        ? [
            window.setTimeout(() => nudgeHostResize(), 0),
            window.setTimeout(() => nudgeHostResize(), 50),
            window.setTimeout(() => nudgeHostResize(), 200),
            window.setTimeout(() => nudgeHostResize(), 600),
          ]
        : [];
    const raf = window.requestAnimationFrame(() => {
      nudgeHostResize();
      window.requestAnimationFrame(() => nudgeHostResize());
    });
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      for (const id of collapse) window.clearTimeout(id);
    };
  }, [open, logVersion]);

  if (!open) {
    return null;
  }

  /* In document flow (not fixed) so body scrollHeight grows and the host iframe height increases. */
  return (
    <section
      className="mt-8 flex w-full flex-col rounded-lg border border-stone-600/90 bg-stone-950/98 shadow-lg backdrop-blur dark:border-slate-500/80"
      aria-label="Origin debug"
    >
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-700/80 px-3 py-2 font-mono text-[11px] text-emerald-300/95">
        <span className="font-semibold" title="Toggle with Ctrl+Alt+D (focus this widget first)">
          Origin debug
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnClass}
            title="Copy State block (surface, widgetLoad, mcpConnect) as JSON"
            onClick={copyState}
          >
            Copy state
          </button>
          <button
            type="button"
            className={btnClass}
            title="Copy all log lines to the clipboard"
            onClick={copyLogs}
          >
            Copy logs
          </button>
          <button
            type="button"
            className={btnClass}
            title="Copy state + tool globals + raw log entries as one JSON"
            onClick={copyAll}
          >
            Copy all
          </button>
          <button
            type="button"
            className={`${btnClass} border-amber-700/80 text-amber-100`}
            title="Close debug panel (or Ctrl+Alt+D)"
            onClick={toggle}
          >
            Close
          </button>
        </div>
      </div>
      <div className="grid min-h-[min(55vh,480px)] max-h-[min(70vh,640px)] grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
        <div className="min-h-0 overflow-y-auto overflow-x-hidden border-b border-stone-800 p-3 font-mono text-[10px] leading-snug text-green-200/95 md:border-b-0 md:border-r md:border-stone-800">
          <p className="mb-2 font-semibold text-emerald-400/90">State</p>
          <pre className="mb-3 whitespace-pre-wrap break-words text-stone-300">
            {sliceJson({
              VITE_ORIGIN_SURFACE: surfaceEnv,
              widgetLoad,
              mcpConnect: mcpStatus,
            })}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolInput</p>
          <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolInput)}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolOutput</p>
          <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolOutput)}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolResponseMetadata</p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolResponseMetadata)}
          </pre>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden p-3 font-mono text-[10px] leading-snug text-green-200/95">
          <p className="mb-2 font-semibold text-emerald-400/90">Log (newest first)</p>
          <ul className="space-y-2">
            {logEntries.map((e, i) => (
              <li
                key={`${e.timestamp}-${i}`}
                className="border-b border-stone-800/80 pb-2 text-stone-300"
              >
                <div className="text-[9px] text-stone-500">{e.timestamp}</div>
                <div className="text-emerald-200/90">{e.message}</div>
                {e.data ? (
                  <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[9px] text-stone-400">
                    {e.data}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
