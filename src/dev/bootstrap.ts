import type { OriginView } from "../origin/originViews.js";
import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent, type OpenAiGlobals } from "../types.js";

function parseViewFromUrl(): OriginView {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v === "emailApproval" || v === "familyLogin") return v;
  return "familyLogin";
}

function createDevOpenAi(initialView: OriginView): OpenAiGlobals & {
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
    theme: "light",
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
    widgetState: null,
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
    requestDisplayMode: async ({ mode }) => ({ mode }),
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
  window.openai = createDevOpenAi(view);
  window.dispatchEvent(
    new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
      detail: {
        globals: {
          theme: "light",
          toolResponseMetadata: { view },
          maxHeight: 720,
          displayMode: "inline",
        },
      },
    }) as SetGlobalsEvent,
  );
}

