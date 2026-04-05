import { useCallback, useEffect, useState } from "react";
import { useOpenAiGlobal } from "../use-openai-global.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";
import type { OriginView } from "./originViews.js";

const FAMILYSEARCH_LOGIN =
  "https://www.familysearch.org/en/identity/login";

const EMAIL_RU = `Уважаемые сотрудники Государственного архива Псковской области!

Прошу Вас осуществить поиск метрической записи о рождении: **Василий Николаевич** (имя и отчество указаны по имеющимся у меня данным), **1874 год**, Псковская губерния / г. Псков (при необходимости прошу уточнить поиск по ближайшим волостям).

Готов оплатить услуги поиска и изготовления копии(ий) в соответствии с действующим прейскурантом. Просьба сообщить стоимость и сроки.

С уважением,  
*(демонстрационное письмо, Origin By Genisent)*`;

const EMAIL_EN = `Dear staff of the State Archive of the Pskov Region,

Please search for a birth (metric) record for **Vasiliy Nikolayevich** (given name and patronymic as available to me), **1874**, Pskov Governorate / Pskov city (please extend the search to nearby districts if needed).

I am willing to pay for search and copy services according to your current fee schedule. Please advise the cost and timeline.

Sincerely,  
*(Demo letter — Origin By Genisent)*`;

function useResolvedView(): OriginView {
  const toolResponseMetadata = useOpenAiGlobal("toolResponseMetadata") as {
    view?: string;
  } | null;
  const toolOutput = useOpenAiGlobal("toolOutput") as { view?: string } | null;

  const fromHost =
    toolResponseMetadata?.view ?? toolOutput?.view ?? undefined;
  if (fromHost === "familyLogin" || fromHost === "emailApproval") {
    return fromHost;
  }

  if (import.meta.env.DEV && typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "familyLogin" || q === "emailApproval") return q;
  }

  return "familyLogin";
}

function setDevViewLocal(view: OriginView) {
  if (!import.meta.env.DEV) return;
  window.openai.toolResponseMetadata = { view };
  window.dispatchEvent(
    new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
      detail: { globals: { toolResponseMetadata: { view } } },
    }) as SetGlobalsEvent,
  );
}

function DevViewBar({ view }: { view: OriginView }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="flex flex-wrap gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <span className="font-medium">Dev:</span>
      <button
        type="button"
        className={`rounded px-2 py-0.5 ${view === "familyLogin" ? "bg-amber-200" : "bg-white/80"}`}
        onClick={() => setDevViewLocal("familyLogin")}
      >
        familyLogin
      </button>
      <button
        type="button"
        className={`rounded px-2 py-0.5 ${view === "emailApproval" ? "bg-amber-200" : "bg-white/80"}`}
        onClick={() => setDevViewLocal("emailApproval")}
      >
        emailApproval
      </button>
      <span className="text-amber-800/90">
        or <code className="rounded bg-white/80 px-1">?view=…</code>
      </span>
    </div>
  );
}

function FamilyLoginPanel() {
  const openExternal = useCallback(() => {
    if (window.openai?.openExternal) {
      window.openai.openExternal({ href: FAMILYSEARCH_LOGIN });
    } else {
      window.open(FAMILYSEARCH_LOGIN, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <div className="flex min-h-[420px] flex-col gap-3">
      <p className="text-sm text-stone-600">
        Mock sign-in context (embedded page may be blank if FamilySearch blocks
        iframe embedding).
      </p>
      <iframe
        title="FamilySearch sign-in"
        src={FAMILYSEARCH_LOGIN}
        className="min-h-[360px] w-full flex-1 rounded-lg border border-stone-200 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      <p className="text-sm text-stone-500">
        If the area above is empty, open the login page in a new tab:{" "}
        <button
          type="button"
          className="text-teal-700 underline hover:text-teal-900"
          onClick={openExternal}
        >
          Open FamilySearch login
        </button>
      </p>
    </div>
  );
}

function EmailApprovalPanel() {
  const [showEn, setShowEn] = useState(false);

  const sendFollowUp = useCallback(async (prompt: string) => {
    try {
      await window.openai?.sendFollowUpMessage?.({ prompt });
    } catch (e) {
      console.log("[Origin] sendFollowUpMessage:", prompt, e);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          Черновик письма (русский)
        </p>
        <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
          {EMAIL_RU.split("**").map((chunk, i) =>
            i % 2 === 1 ? (
              <strong key={i}>{chunk}</strong>
            ) : (
              <span key={i}>{chunk}</span>
            ),
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-teal-700 underline hover:text-teal-900"
          onClick={() => setShowEn((s) => !s)}
        >
          {showEn ? "Hide English translation" : "Show English translation"}
        </button>
        {showEn ? (
          <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
            <p className="mb-2 text-xs font-medium text-stone-500">
              English (for reference)
            </p>
            <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {EMAIL_EN.split("**").map((chunk, i) =>
                i % 2 === 1 ? (
                  <strong key={i}>{chunk}</strong>
                ) : (
                  <span key={i}>{chunk}</span>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-end gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-stone-50/80">
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-100"
          onClick={() =>
            void sendFollowUp(
              "User cancelled the mock archive email draft (Origin / Pskov 1874).",
            )
          }
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800"
          onClick={() =>
            void sendFollowUp(
              "User approved sending the mock archive research request email (Vasiliy Nikolayevich, 1874, Pskov).",
            )
          }
        >
          Approve
        </button>
      </div>
    </div>
  );
}

function DebugPanel() {
  const [open, setOpen] = useState(false);
  const meta = useOpenAiGlobal("toolResponseMetadata");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <p className="mt-2 text-center text-[10px] text-stone-400">
        Ctrl+Alt+D debug
      </p>
    );
  }

  return (
    <div className="mt-3 max-h-40 overflow-auto rounded border border-stone-200 bg-stone-900 p-2 font-mono text-[10px] text-green-200">
      <pre className="whitespace-pre-wrap">
        {JSON.stringify({ toolResponseMetadata: meta }, null, 2)}
      </pre>
    </div>
  );
}

export function OriginApp() {
  const view = useResolvedView();

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onGlobals = (e: SetGlobalsEvent) => {
      if (e.detail.globals.toolResponseMetadata) {
        const v = (e.detail.globals.toolResponseMetadata as { view?: string })
          ?.view;
        if (v === "familyLogin" || v === "emailApproval") {
          const url = new URL(window.location.href);
          url.searchParams.set("view", v);
          window.history.replaceState({}, "", url.toString());
        }
      }
    };
    window.addEventListener(SET_GLOBALS_EVENT_TYPE, onGlobals as EventListener);
    return () =>
      window.removeEventListener(
        SET_GLOBALS_EVENT_TYPE,
        onGlobals as EventListener,
      );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200 text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight text-stone-800">
          Origin By Genisent
        </h1>
        <p className="text-xs text-stone-500">MCP App demo (mock widget)</p>
      </header>

      <DevViewBar view={view} />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {view === "familyLogin" ? (
          <>
            <h2 className="mb-3 text-base font-medium text-stone-800">
              Mock FamilySearch login
            </h2>
            <FamilyLoginPanel />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-base font-medium text-stone-800">
              Mock email — archive research (Pskov, 1874)
            </h2>
            <EmailApprovalPanel />
          </>
        )}

        <DebugPanel />
      </main>
    </div>
  );
}
