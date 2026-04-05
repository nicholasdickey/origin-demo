import { useCallback, useEffect, useState } from "react";
import { useOpenAiGlobal } from "../use-openai-global.js";
import { useHostThemeSync } from "../useHostThemeSync.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from "../types.js";
import {
  type OriginView,
  type ResolvedOriginView,
  parseViewFromHostPayload,
  parseViewFromToolInput,
} from "./originViews.js";
import { MockFamilySearchLogin } from "./MockFamilySearchLogin.js";
import { OriginHeader } from "./OriginHeader.js";

const EMAIL_TO_RU =
  "Государственный архив Псковской области <zapros@gosarchiv.pskov.ru>";
const EMAIL_CC_RU = "—";
const EMAIL_SUBJECT_RU =
  "Просьба о поиске метрической записи о рождении — Василий Николаевич, 1874 г.";

const EMAIL_TO_EN =
  "State Archive of the Pskov Region <inquiries@archive.pskov.ru>";
const EMAIL_CC_EN = "—";
const EMAIL_SUBJECT_EN =
  "Request: birth register search — Vasiliy Nikolayevich, 1874 (Pskov region)";

const EMAIL_BODY_RU = `Уважаемые сотрудники!

Прошу Вас осуществить поиск метрической записи о рождении: **Василий Николаевич** (имя и отчество — по имеющимся у меня сведениям), **1874 год**, Псковская губерния / г. Псков (при необходимости прошу расширить поиск по соседним волостям).

Готов оплатить услуги поиска и изготовления копии (копий) в соответствии с вашим прейскурантом. Просьба сообщить стоимость и сроки.

С уважением,  
*(демонстрационное письмо, Origin By Genisent)*`;

/** English-only body (translation of the Russian draft above). */
const EMAIL_BODY_EN = `Dear Sir or Madam,

Please search for a civil birth register (metric) record for **Vasiliy Nikolayevich** (forename and patronymic per the information available to me), born in **1874**, in Pskov Governorate / the city of Pskov (please extend the search to neighbouring districts if appropriate).

I agree to pay for research and copy services according to your current fee schedule. Please let me know the cost and the expected timeframe.

Sincerely,  
*(Demo message — Origin By Genisent)*`;

function renderBoldSegments(text: string) {
  return text.split("**").map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{chunk}</strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}

function EmailHeaderRows(props: {
  toLabel: string;
  ccLabel: string;
  subjectLabel: string;
  toValue: string;
  ccValue: string;
  subjectValue: string;
}) {
  const { toLabel, ccLabel, subjectLabel, toValue, ccValue, subjectValue } =
    props;
  return (
    <div className="mb-4 space-y-0 border-b border-stone-200 pb-3 dark:border-slate-600">
      <div className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-2 text-sm sm:grid-cols-[5rem_1fr]">
        <span className="font-medium text-stone-500 dark:text-slate-400">{toLabel}</span>
        <span className="text-stone-800 dark:text-slate-200">{toValue}</span>
        <span className="font-medium text-stone-500 dark:text-slate-400">{ccLabel}</span>
        <span className="text-stone-800 dark:text-slate-200">{ccValue}</span>
        <span className="font-medium text-stone-500 dark:text-slate-400">{subjectLabel}</span>
        <span className="text-stone-800 dark:text-slate-200">{subjectValue}</span>
      </div>
    </div>
  );
}

function useResolvedView(): ResolvedOriginView {
  const toolResponseMetadata = useOpenAiGlobal("toolResponseMetadata");
  const toolOutput = useOpenAiGlobal("toolOutput");
  const toolInput = useOpenAiGlobal("toolInput");

  // Order: structured output (incl. _meta.view) first; then tool name from
  // toolInput (often set early); then toolResponseMetadata (can stay stale for
  // many seconds). Matches ChatVault leaning on toolOutput + avoids long wrong
  // screen when only metadata was updated from a previous tool.
  const fromHost =
    parseViewFromHostPayload(toolOutput) ??
    parseViewFromToolInput(toolInput) ??
    parseViewFromHostPayload(toolResponseMetadata) ??
    undefined;
  if (fromHost === "familyLogin" || fromHost === "emailApproval") {
    return fromHost;
  }

  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "familyLogin" || q === "emailApproval") return q;
  }

  // Do not default to familyLogin: the host often applies tool metadata one tick
  // after first paint; defaulting caused a flash of the wrong screen (e.g. email tool).
  return "pending";
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

function DevViewBar({ view }: { view: ResolvedOriginView }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="flex flex-wrap gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-slate-600/80 dark:bg-slate-800/70 dark:text-slate-200">
      <span className="font-medium">Dev:</span>
      <button
        type="button"
        className={`rounded px-2 py-0.5 ${view === "familyLogin" ? "bg-amber-200 dark:bg-slate-600/90" : "bg-white/80 dark:bg-slate-900/50"}`}
        onClick={() => setDevViewLocal("familyLogin")}
      >
        familyLogin
      </button>
      <button
        type="button"
        className={`rounded px-2 py-0.5 ${view === "emailApproval" ? "bg-amber-200 dark:bg-slate-600/90" : "bg-white/80 dark:bg-slate-900/50"}`}
        onClick={() => setDevViewLocal("emailApproval")}
      >
        emailApproval
      </button>
      <span className="text-amber-800/90 dark:text-slate-300/90">
        or <code className="rounded bg-white/80 px-1 dark:bg-slate-950/80">?view=…</code>
      </span>
    </div>
  );
}

function FamilyLoginPanel() {
  return (
    <div className="flex min-h-[420px] flex-col gap-3">
      <MockFamilySearchLogin />
    </div>
  );
}

function EmailApprovalPanel() {
  const [showEn, setShowEn] = useState(false);
  const [toRu, setToRu] = useState(EMAIL_TO_RU);
  const [ccRu, setCcRu] = useState(EMAIL_CC_RU);
  const [subjectRu, setSubjectRu] = useState(EMAIL_SUBJECT_RU);
  const [bodyRu, setBodyRu] = useState(EMAIL_BODY_RU);

  const sendFollowUp = useCallback(async (prompt: string) => {
    try {
      await window.openai?.sendFollowUpMessage?.({ prompt });
    } catch (e) {
      console.log("[Origin] sendFollowUpMessage:", prompt, e);
    }
  }, []);

  const onApprove = useCallback(() => {
    const draft = [
      "User approved sending the proposed archive email with the following content:",
      "",
      `To: ${toRu}`,
      `Cc: ${ccRu}`,
      `Subject: ${subjectRu}`,
      "",
      bodyRu,
    ].join("\n");
    void sendFollowUp(draft);
  }, [bodyRu, ccRu, sendFollowUp, subjectRu, toRu]);

  const onCancel = useCallback(() => {
    void sendFollowUp(
      "User cancelled — did not send the proposed archive email (Pskov / 1874 research request).",
    );
  }, [sendFollowUp]);

  const inputClass =
    "w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 dark:border-slate-600 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500";

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="rounded-lg border border-teal-200/80 bg-teal-50/60 px-4 py-3 text-sm text-stone-800 dark:border-teal-700/40 dark:bg-teal-950/35 dark:text-slate-200">
        <p className="font-medium text-stone-900 dark:text-slate-100">
          Please review and approve the proposed email to be sent.
        </p>
        <p className="mt-1.5 text-stone-600 dark:text-slate-400">
          Edit the fields below if needed, then choose <strong>Approve</strong>{" "}
          to confirm or <strong>Cancel</strong> to discard.
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-600/90 dark:bg-slate-800/85 dark:shadow-slate-950/40">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400">
          Draft to send (Russian)
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="email-to-ru" className="mb-1 block text-xs font-medium text-stone-500 dark:text-slate-400">
              To
            </label>
            <input
              id="email-to-ru"
              type="text"
              className={inputClass}
              value={toRu}
              onChange={(e) => setToRu(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="email-cc-ru" className="mb-1 block text-xs font-medium text-stone-500 dark:text-slate-400">
              Cc
            </label>
            <input
              id="email-cc-ru"
              type="text"
              className={inputClass}
              value={ccRu}
              onChange={(e) => setCcRu(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="email-subject-ru"
              className="mb-1 block text-xs font-medium text-stone-500 dark:text-slate-400"
            >
              Subject
            </label>
            <input
              id="email-subject-ru"
              type="text"
              className={inputClass}
              value={subjectRu}
              onChange={(e) => setSubjectRu(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="email-body-ru" className="mb-1 block text-xs font-medium text-stone-500 dark:text-slate-400">
              Message
            </label>
            <p className="mb-1.5 text-[11px] text-stone-500 dark:text-slate-400">
              Use <code className="rounded bg-stone-100 px-1 dark:bg-slate-900">**text**</code> for
              emphasis if you want bold when copying elsewhere.
            </p>
            <textarea
              id="email-body-ru"
              className={`${inputClass} min-h-[220px] resize-y font-sans leading-relaxed`}
              value={bodyRu}
              onChange={(e) => setBodyRu(e.target.value)}
              spellCheck
            />
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-teal-700 underline hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
          onClick={() => setShowEn((s) => !s)}
        >
          {showEn ? "Hide English reference" : "Show English reference translation"}
        </button>
        {showEn ? (
          <div className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/40">
            <p className="mb-2 text-xs text-emerald-900 dark:text-emerald-200/90">
              Reference only — does not update automatically when you edit the
              Russian draft above.
            </p>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              English (reference)
            </p>
            <EmailHeaderRows
              toLabel="To:"
              ccLabel="Cc:"
              subjectLabel="Subject:"
              toValue={EMAIL_TO_EN}
              ccValue={EMAIL_CC_EN}
              subjectValue={EMAIL_SUBJECT_EN}
            />
            <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-900 dark:text-slate-200">
              {renderBoldSegments(EMAIL_BODY_EN)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-end gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-stone-50/80 dark:border-slate-700/90 dark:bg-slate-900/75 dark:supports-[backdrop-filter]:bg-slate-900/70">
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          onClick={onApprove}
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
      <p className="mt-2 text-center text-[10px] text-stone-400 dark:text-slate-500">
        Ctrl+Alt+D debug
      </p>
    );
  }

  return (
    <div className="mt-3 max-h-40 overflow-auto rounded border border-stone-200 bg-stone-900 p-2 font-mono text-[10px] text-green-200 dark:border-slate-600 dark:bg-slate-950">
      <pre className="whitespace-pre-wrap">
        {JSON.stringify({ toolResponseMetadata: meta }, null, 2)}
      </pre>
    </div>
  );
}

export function OriginApp() {
  const view = useResolvedView();
  useHostThemeSync();

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
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200 text-stone-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <OriginHeader />

      <DevViewBar view={view} />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {view === "pending" ? (
          <div
            className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-stone-200 bg-white/80 px-6 py-12 text-center text-stone-600 shadow-sm dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-300"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-teal-400 dark:border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-stone-700 dark:text-slate-200">
              Loading widget…
            </p>
            <p className="max-w-sm text-xs text-stone-500 dark:text-slate-400">
              Waiting for the chat to attach this tool’s view. If this stays here,
              try running the tool again from the conversation.
            </p>
          </div>
        ) : view === "familyLogin" ? (
          <FamilyLoginPanel />
        ) : (
          <>
            <h2 className="mb-1 text-base font-semibold text-stone-800 dark:text-slate-100">
              Review proposed email
            </h2>
            <p className="mb-4 text-sm text-stone-600 dark:text-slate-400">
              Archive research request (Pskov region, 1874) — edit the draft
              below, then approve or cancel.
            </p>
            <EmailApprovalPanel />
          </>
        )}

        <DebugPanel />
      </main>
    </div>
  );
}
