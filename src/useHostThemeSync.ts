import { useEffect } from "react";
import { useOpenAiGlobal } from "./use-openai-global.js";

/**
 * Resolves light/dark like ChatVault: prefer `window.openai.theme`, then
 * `data-theme` / `class="dark"` on `document.documentElement` (host-injected).
 */
function resolveIsDarkFromHost(): boolean {
  if (typeof document === "undefined") return false;
  const g = window.openai?.theme;
  if (g === "dark") return true;
  if (g === "light") return false;
  const domTheme = document.documentElement.getAttribute("data-theme");
  if (domTheme === "dark") return true;
  if (domTheme === "light") return false;
  return document.documentElement.classList.contains("dark");
}

function applyDarkClassToDocument(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * Keeps `<html class="dark">` in sync with the MCP host so Tailwind `dark:`
 * variants match ChatGPT / other clients that set `theme` or DOM hints.
 */
export function useHostThemeSync() {
  const theme = useOpenAiGlobal("theme");

  useEffect(() => {
    const sync = () => {
      applyDarkClassToDocument(resolveIsDarkFromHost());
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    return () => observer.disconnect();
  }, [theme]);
}
