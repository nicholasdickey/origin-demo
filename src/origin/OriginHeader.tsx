import { useCallback } from "react";
import { useOpenAiGlobal } from "../use-openai-global.js";
import { ORIGIN_LOGIN_URL, ORIGIN_SAAS_URL } from "../config/site.js";
import type { OriginWidgetState } from "./originWidgetState.js";
import type { OriginUserInfo } from "./widgetLoadTypes.js";
import {
  IconFullscreen,
  IconFullscreenExit,
  IconLogin,
  IconOpenInNew,
} from "./OriginHeaderIcons.js";
import originLogoUrl from "../assets/origin-logo.png";

const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors " +
  "text-stone-600 hover:bg-stone-100 hover:text-stone-900 " +
  "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100";

const textBtn =
  "max-w-[10rem] truncate rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
  "text-stone-700 hover:bg-stone-100 hover:text-stone-900 " +
  "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100";

const loginBtn =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors " +
  "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 " +
  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

function mergeHeaderState(
  widgetState: OriginWidgetState | null,
  loaded: OriginUserInfo | null | undefined,
): OriginWidgetState | null {
  if (!loaded && !widgetState) return null;
  const w = widgetState ?? {};
  return {
    ...w,
    userName: loaded?.userName ?? w.userName,
    isAnonymous:
      loaded !== undefined && loaded !== null
        ? loaded.isAnon
        : w.isAnonymous,
    portalLink: loaded?.portalLink ?? w.portalLink ?? null,
    loginLink: loaded?.loginLink ?? w.loginLink ?? null,
    isAnonymousPlan: loaded?.isAnonymousPlan ?? w.isAnonymousPlan,
    remainingSlots: loaded?.remainingSlots ?? w.remainingSlots,
  };
}

export function OriginHeader(props: {
  /** From `widgetLoadInternalData` / `_meta.userInfo` (ChatVault parity). */
  loadedUserInfo?: OriginUserInfo | null;
}) {
  const { loadedUserInfo } = props;
  const displayMode = useOpenAiGlobal("displayMode") ?? "inline";
  const widgetState = useOpenAiGlobal("widgetState") as OriginWidgetState | null;

  const merged = mergeHeaderState(widgetState, loadedUserInfo ?? null);

  const openExternal = useCallback((href: string) => {
    if (window.openai?.openExternal) {
      window.openai.openExternal({ href });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, []);

  const onOpenSaaS = useCallback(() => {
    openExternal(ORIGIN_SAAS_URL);
  }, [openExternal]);

  const onLogin = useCallback(() => {
    const link = merged?.loginLink ?? ORIGIN_LOGIN_URL;
    openExternal(link);
  }, [merged?.loginLink, openExternal]);

  const onFullscreen = useCallback(async () => {
    const next = displayMode === "fullscreen" ? "inline" : "fullscreen";
    try {
      await window.openai?.requestDisplayMode?.({ mode: next });
    } catch (e) {
      console.warn("[Origin] requestDisplayMode:", e);
    }
  }, [displayMode]);

  const showNameChip =
    merged !== null &&
    merged.isAnonymous !== true &&
    Boolean(merged.userName?.trim());

  const showSignIn =
    !showNameChip &&
    merged?.isAnonymousPlan &&
    Boolean(merged.portalLink?.trim());

  return (
    <header className="border-b border-stone-200/80 bg-white/90 px-3 py-3.5 backdrop-blur sm:px-4 dark:border-slate-700/70 dark:bg-slate-900/80">
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <img
            src={originLogoUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-lg object-contain sm:h-24 sm:w-24"
            width={96}
            height={96}
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-stone-800 dark:text-slate-100 sm:text-xl">
              Origin By Genisent
            </h1>
            <p className="hidden truncate text-xs text-stone-500 sm:block dark:text-slate-400">
              Automate archive search and retrieval
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {showNameChip ? (
            <button
              type="button"
              className={textBtn}
              title="Open on website"
              onClick={onOpenSaaS}
            >
              {merged?.userName}
            </button>
          ) : showSignIn ? (
            <button
              type="button"
              className={loginBtn}
              title="Sign in"
              onClick={() => {
                const url = merged?.portalLink ?? merged?.loginLink ?? ORIGIN_LOGIN_URL;
                openExternal(url);
              }}
            >
              <IconLogin className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          ) : (
            <button
              type="button"
              className={loginBtn}
              title="Sign in on website"
              onClick={onLogin}
            >
              <IconLogin className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}

          {merged?.isAnonymousPlan &&
            merged.remainingSlots !== undefined && (
              <span
                className="rounded-lg border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 dark:border-slate-600 dark:text-slate-300"
                title="Remaining slots"
              >
                {merged.remainingSlots}
              </span>
            )}

          <button
            type="button"
            className={iconBtn}
            title="Open on website"
            onClick={onOpenSaaS}
          >
            <IconOpenInNew className="h-5 w-5" />
          </button>

          <button
            type="button"
            className={iconBtn}
            title={
              displayMode === "fullscreen"
                ? "Exit fullscreen"
                : "Enter fullscreen"
            }
            onClick={() => void onFullscreen()}
          >
            {displayMode === "fullscreen" ? (
              <IconFullscreenExit className="h-5 w-5" />
            ) : (
              <IconFullscreen className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
