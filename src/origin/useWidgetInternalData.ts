import { useEffect, useState } from "react";
import type { OriginUserInfo, WidgetLoadStructuredContent } from "./widgetLoadTypes.js";
import { addLog } from "./originDebugLog.js";

export type WidgetLoadData = WidgetLoadStructuredContent & { userInfo: OriginUserInfo };

function devMockLoad(surface: string): WidgetLoadData {
  const userInfo: OriginUserInfo = {
    portalLink: null,
    loginLink: null,
    isAnon: false,
    userName: "Demo User",
  };
  if (surface === "familyLogin") {
    return {
      surface: "familyLogin",
      message: "Dev: FamilySearch mock.",
      userInfo,
    };
  }
  if (surface === "emailApproval") {
    return {
      surface: "emailApproval",
      message: "Dev: Email mock.",
      userInfo,
    };
  }
  return {
    surface: "dashboard",
    projects: [
      {
        id: "dev-p1",
        title: "Dev — sample project",
        status: "In progress",
        threads: [
          {
            id: "d1",
            state: "running",
            data: "Sample thread",
            waitingOn: "Dev host",
          },
        ],
      },
    ],
    userInfo,
  };
}

/** If `callServerTool` never settles, loading would stay true forever; match ChatVault-style timeouts. */
const WIDGET_LOAD_TIMEOUT_MS = 45_000;

/**
 * Calls `widgetLoadInternalData` on the MCP server (production) or returns mock data (dev).
 */
function summarizeLoadData(sc: WidgetLoadData | null | undefined) {
  if (!sc || typeof sc !== "object") return null;
  const row: Record<string, unknown> = { surface: sc.surface };
  if (sc.surface === "dashboard" && "projects" in sc && Array.isArray(sc.projects)) {
    row.projectCount = sc.projects.length;
  }
  if ("message" in sc && typeof sc.message === "string") {
    row.messagePreview = sc.message.slice(0, 120);
  }
  if ("userInfo" in sc && sc.userInfo && typeof sc.userInfo === "object") {
    const u = sc.userInfo as { userName?: string; isAnon?: boolean };
    row.userName = u.userName;
    row.isAnon = u.isAnon;
  }
  return row;
}

export function useWidgetInternalData(): {
  data: WidgetLoadData | null;
  error: string | null;
  loading: boolean;
} {
  const [data, setData] = useState<WidgetLoadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const surface = import.meta.env.VITE_ORIGIN_SURFACE ?? "dashboard";

      if (import.meta.env.DEV) {
        addLog("widgetLoadInternalData: DEV mock", { surface });
        console.log("[Origin] widgetLoadInternalData (dev mock)", { surface });
        const mock = devMockLoad(surface);
        setData(mock);
        setLoading(false);
        addLog("widgetLoadInternalData: DEV mock done", {
          summary: summarizeLoadData(mock),
        });
        return;
      }

      addLog("widgetLoadInternalData: calling callServerTool", {
        surface,
      });
      console.log("[Origin] widgetLoadInternalData: calling callServerTool", {
        surface,
      });

      try {
        const toolInput = window.openai?.toolInput as Record<string, unknown> | null;
        const nameArg =
          typeof toolInput?.name === "string" ? toolInput.name : undefined;
        const args =
          toolInput &&
          typeof toolInput === "object" &&
          "arguments" in toolInput &&
          typeof (toolInput as { arguments?: unknown }).arguments === "object" &&
          (toolInput as { arguments?: unknown }).arguments !== null
            ? ((toolInput as { arguments: Record<string, unknown> }).arguments)
            : {};
        const { app: mcpApp } = await import("../app-instance.js");
        const toolName =
          nameArg ??
          (mcpApp.getHostContext?.()?.toolInfo?.tool?.name as string | undefined);
        const loadArgs = { ...args, ...(toolName ? { toolName } : {}) };
        const result = await Promise.race([
          mcpApp.callServerTool({
            name: "widgetLoadInternalData",
            arguments: loadArgs,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `Widget load timed out after ${WIDGET_LOAD_TIMEOUT_MS / 1000}s (upstream MCP may be unreachable; check widgetCSP, connector, and proxy logs).`,
                ),
              );
            }, WIDGET_LOAD_TIMEOUT_MS);
          }),
        ]);
        if (cancelled) return;
        if (result.isError) {
          const errPayload = {
            isError: result.isError,
            message:
              result && typeof result === "object" && "message" in result
                ? String((result as { message?: unknown }).message)
                : undefined,
          };
          addLog("widgetLoadInternalData: tool error", errPayload);
          console.log("[Origin] widgetLoadInternalData: tool error", errPayload);
          setError("Widget load failed");
          return;
        }
        const sc = result.structuredContent as WidgetLoadData | undefined;
        if (sc && typeof sc === "object" && "userInfo" in sc) {
          setData(sc);
          const summary = summarizeLoadData(sc);
          addLog("widgetLoadInternalData: success", { summary });
          console.log("[Origin] widgetLoadInternalData: success", { summary });
        } else {
          addLog("widgetLoadInternalData: unexpected structuredContent", {
            hasContent: Boolean(sc),
          });
          console.log("[Origin] widgetLoadInternalData: unexpected structuredContent");
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          addLog("widgetLoadInternalData: exception", {
            error: msg.slice(0, 500),
          });
          console.log("[Origin] widgetLoadInternalData: exception", msg);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}
