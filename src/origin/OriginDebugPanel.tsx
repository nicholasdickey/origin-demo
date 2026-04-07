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

function sliceJson(value: unknown, max = 6000): string {
  try {
    const s = JSON.stringify(value, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}\n… [truncated]`;
  } catch {
    return String(value);
  }
}

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

  if (!open) {
    /* Fixed so it stays visible without scrolling; above EmailApproval fixed bars (z-10). */
    return (
      <div className="pointer-events-none fixed bottom-3 left-3 z-[200] flex flex-col items-start gap-1">
        <button
          type="button"
          className="pointer-events-auto rounded-lg border border-stone-400/80 bg-stone-900/95 px-3 py-2 text-left text-[11px] font-medium text-emerald-200 shadow-lg backdrop-blur hover:bg-stone-800 dark:border-slate-500 dark:bg-slate-950/95 dark:text-emerald-200/95"
          onClick={toggle}
          title="Open Origin debug panel (or press Ctrl+Alt+D while this widget is focused)"
        >
          Origin debug
          <span className="mt-0.5 block font-normal text-[9px] text-stone-400 dark:text-slate-500">
            Click or Ctrl+Alt+D (focus iframe first)
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] max-h-[min(70vh,520px)] border-t border-stone-600/90 bg-stone-950/98 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur dark:border-slate-500/80">
      <div className="flex items-center justify-between gap-2 border-b border-stone-700/80 px-3 py-1.5 font-mono text-[11px] text-emerald-300/95">
        <span>Origin debug</span>
        <button
          type="button"
          className="rounded border border-stone-600 px-2 py-0.5 text-[10px] text-stone-200 hover:bg-stone-800"
          onClick={toggle}
        >
          Close
        </button>
      </div>
      <div className="grid max-h-[calc(min(70vh,520px)-2.5rem)] grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
        <div className="max-h-full overflow-auto border-b border-stone-800 p-3 font-mono text-[10px] leading-snug text-green-200/95 md:border-b-0 md:border-r">
          <p className="mb-2 font-semibold text-emerald-400/90">State</p>
          <pre className="mb-3 whitespace-pre-wrap break-words text-stone-300">
            {sliceJson({
              VITE_ORIGIN_SURFACE: surfaceEnv,
              widgetLoad,
              mcpConnect: mcpStatus,
            })}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolInput</p>
          <pre className="mb-3 whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolInput)}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolOutput</p>
          <pre className="mb-3 whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolOutput)}
          </pre>
          <p className="mb-1 font-semibold text-emerald-400/90">toolResponseMetadata</p>
          <pre className="whitespace-pre-wrap break-words text-stone-300">
            {sliceJson(toolResponseMetadata)}
          </pre>
        </div>
        <div className="max-h-full overflow-auto p-3 font-mono text-[10px] leading-snug text-green-200/95">
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
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[9px] text-stone-400">
                    {e.data}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
