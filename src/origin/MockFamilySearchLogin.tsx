import { useCallback, useState, type FormEvent } from "react";
import { FAMILYSEARCH_IDENT_LOGIN_URL } from "../config/familysearch.js";

/** Approximates FamilySearch identity login layout (ident.familysearch.org) — demo UI only; no network auth. */
export function MockFamilySearchLogin(props: { loginUrl?: string }) {
  const loginUrl = props.loginUrl ?? FAMILYSEARCH_IDENT_LOGIN_URL;
  const [accountTab, setAccountTab] = useState<"fs" | "church">("fs");

  const openExternal = useCallback(() => {
    if (window.openai?.openExternal) {
      window.openai.openExternal({ href: loginUrl });
    } else {
      window.open(loginUrl, "_blank", "noopener,noreferrer");
    }
  }, [loginUrl]);

  const onSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="fs-mock-login text-[15px] leading-normal text-stone-800 dark:text-slate-200">
      {/* Page background like ident */}
      <div className="rounded-lg border border-stone-200/90 bg-[#f0f2f4] px-3 py-6 sm:px-6 dark:border-slate-600/80 dark:bg-slate-900/45">
        <div className="mx-auto max-w-[400px] rounded-xl border border-stone-200/80 bg-white px-6 pb-8 pt-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border-slate-600/70 dark:bg-slate-800/95 dark:shadow-[0_4px_24px_rgba(15,23,42,0.45)]">
          {/* Wordmark area — generic tree mark + text styling, not official logo asset */}
          <div className="mb-6 flex flex-col items-center">
            <div
              className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1b5e4a]"
              aria-hidden
            >
              <svg
                viewBox="0 0 48 48"
                className="h-7 w-7 text-[#1b5e4a]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M24 8 L32 20 L28 20 L34 32 L14 32 L20 20 L16 20 Z" />
                <path d="M24 32 L24 40" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-center font-serif text-[1.35rem] font-normal tracking-tight text-[#1b5e4a]">
              FamilySearch
            </span>
          </div>

          {/* Account type tabs */}
          <div className="mb-6 flex border-b border-stone-200 dark:border-slate-600">
            <button
              type="button"
              className={`relative flex-1 pb-3 text-center text-sm font-medium transition-colors ${
                accountTab === "fs"
                  ? "text-[#0d5c4a] dark:text-emerald-400"
                  : "text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
              onClick={() => setAccountTab("fs")}
            >
              FamilySearch Account
              {accountTab === "fs" ? (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5c4a] dark:bg-emerald-400" />
              ) : null}
            </button>
            <button
              type="button"
              className={`relative flex-1 pb-3 text-center text-sm font-medium transition-colors ${
                accountTab === "church"
                  ? "text-[#0d5c4a] dark:text-emerald-400"
                  : "text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
              onClick={() => setAccountTab("church")}
            >
              Church Account
              {accountTab === "church" ? (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5c4a] dark:bg-emerald-400" />
              ) : null}
            </button>
          </div>

          {accountTab === "church" ? (
            <div className="space-y-5 text-center">
              <button
                type="button"
                className="w-full rounded-md bg-[#0d5c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#094a3b]"
                onClick={openExternal}
              >
                Continue with Church Account
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div>
                <label
                  htmlFor="fs-mock-username"
                  className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-slate-300"
                >
                  Username
                </label>
                <input
                  id="fs-mock-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-inner outline-none ring-[#0d5c4a] placeholder:text-stone-400 focus:border-[#0d5c4a] focus:ring-1 dark:border-slate-600 dark:bg-slate-950/90 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                  placeholder=""
                />
              </div>
              <div>
                <label
                  htmlFor="fs-mock-password"
                  className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-slate-300"
                >
                  Password
                </label>
                <input
                  id="fs-mock-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-inner outline-none ring-[#0d5c4a] placeholder:text-stone-400 focus:border-[#0d5c4a] focus:ring-1 dark:border-slate-600 dark:bg-slate-950/90 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                  placeholder=""
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="fs-mock-remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-[#0d5c4a] focus:ring-[#0d5c4a] dark:border-slate-600 dark:text-emerald-500 dark:focus:ring-emerald-500"
                />
                <label
                  htmlFor="fs-mock-remember"
                  className="text-sm text-stone-700 dark:text-slate-300"
                >
                  Keep me signed in
                </label>
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-md bg-[#0d5c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#094a3b]"
              >
                Sign in
              </button>
            </form>
          )}

          {accountTab === "fs" ? (
            <div className="mt-6 space-y-3 text-center text-sm">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  className="text-[#0b6ebc] hover:underline"
                  tabIndex={-1}
                >
                  Forgot username
                </button>
                <button
                  type="button"
                  className="text-[#0b6ebc] hover:underline"
                  tabIndex={-1}
                >
                  Forgot password
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="text-[#0b6ebc] hover:underline"
                  tabIndex={-1}
                >
                  Create account
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Having trouble?{" "}
                <button
                  type="button"
                  className="text-[#0b6ebc] hover:underline"
                  tabIndex={-1}
                >
                  Visit Help Center
                </button>
              </p>
            </div>
          ) : null}

          <div className="mt-8 border-t border-stone-200 pt-5 text-center dark:border-slate-600">
            <button
              type="button"
              className="text-sm text-[#0b6ebc] hover:underline"
              onClick={openExternal}
            >
              Open live FamilySearch sign-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
