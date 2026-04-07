import { useEffect } from "react";
import type { ArchiveProject } from "./widgetLoadTypes.js";
import { addLog } from "./originDebugLog.js";

export function DashboardHome(props: { projects: ArchiveProject[] }) {
  const { projects } = props;

  useEffect(() => {
    console.log("[Origin] DashboardHome", { projectCount: projects.length });
    addLog("DashboardHome", { projectCount: projects.length });
  }, [projects.length]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-stone-800 dark:text-slate-100">
          Ongoing archive research
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
          Projects and outstanding search threads (mock data until backend wiring).
        </p>
      </div>

      <ul className="space-y-4">
        {projects.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-stone-200 bg-white/90 p-4 shadow-sm dark:border-slate-600/80 dark:bg-slate-900/60"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium text-stone-900 dark:text-slate-100">{p.title}</h3>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-900/50 dark:text-teal-100">
                {p.status}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-500">
              Outstanding threads
            </p>
            <ul className="mt-2 space-y-2">
              {p.threads.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-stone-100 bg-stone-50/80 px-3 py-2 text-sm dark:border-slate-700/80 dark:bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        t.state === "running"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : t.state === "blocked"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-stone-600 dark:text-slate-400"
                      }
                    >
                      {t.state}
                    </span>
                    <span className="text-stone-400 dark:text-slate-600">·</span>
                    <span className="text-stone-800 dark:text-slate-200">{t.data}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-500">
                    <span className="font-medium text-stone-600 dark:text-slate-400">Waiting on:</span>{" "}
                    {t.waitingOn}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
