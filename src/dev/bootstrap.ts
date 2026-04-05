import type { OriginView } from "../origin/originViews.js";
import type { OriginWidgetState } from "../origin/originWidgetState.js";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiGlobals,
} from "../types.js";

function parseViewFromUrl(): OriginView {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v === "emailApproval" || v === "familyLogin") return v;
  return "familyLogin";
}

function parseThemeFromUrl(): "light" | "dark" {
  const t = new URLSearchParams(window.location.search).get("theme");
  if (t === "dark") return "dark";
  return "light";
}

/** Dev-only: `?anon=1` → anonymous; `?user=Name` → logged in as Name (default: Demo User). */
function parseWidgetAuthFromUrl(): OriginWidgetState {
  const params = new URLSearchParams(window.location.search);
  if (params.get("anon") === "1") {
    return { isAnonymous: true };
  }
  const u = params.get("user") ?? params.get("userName");
  if (u) return { userName: u, isAnonymous: false };
  return { userName: "Demo User", isAnonymous: false };
}

function createDevOpenAi(
  initialView: OriginView,
  theme: "light" | "dark",
  widgetState: OriginWidgetState,
): OpenAiGlobals & {
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal: (payload: { href: string }) => void;
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ result: string }>;
  requestDisplayMode: (args: {
    mode: "inline" | "fullscreen" | "pip";
  }) => Promise<{ mode: "inline" | "fullscreen" | "pip" }>;
} {
  const base: OpenAiGlobals = {
    theme,
    locale: "en",
    userAgent: {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },
    maxHeight: 720,
    displayMode: "inline",
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    toolInput: {},
    toolOutput: null,
    toolResponseMetadata: { view: initialView },
    widgetState,
    setWidgetState: async (state) => {
      if (window.openai) {
        window.openai.widgetState = state;
      }
      window.dispatchEvent(
        new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals: { widgetState: state } },
        }) as SetGlobalsEvent,
      );
    },
  };

  return {
    ...base,
    callTool: async () => ({ result: "" }),
    requestDisplayMode: async ({ mode }) => {
      if (window.openai) {
        window.openai.displayMode = mode;
      }
      window.dispatchEvent(
        new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals: { displayMode: mode } },
        }) as SetGlobalsEvent,
      );
      return { mode };
    },
    openExternal: ({ href }) => {
      window.open(href, "_blank", "noopener,noreferrer");
    },
    sendFollowUpMessage: async ({ prompt }) => {
      console.log("[Origin dev] sendFollowUpMessage:", prompt);
    },
  };
}

/** Install mock `window.openai` and globals for Vite dev (no MCP host). */
export function installDevBootstrap(): void {
  const view = parseViewFromUrl();
  const theme = parseThemeFromUrl();
  const widgetState = parseWidgetAuthFromUrl();
  window.openai = createDevOpenAi(view, theme, widgetState);
  window.dispatchEvent(
    new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
      detail: {
        globals: {
          theme,
          toolResponseMetadata: { view },
          widgetState,
          maxHeight: 720,
          displayMode: "inline",
        },
      },
    }) as SetGlobalsEvent,
  );
}
