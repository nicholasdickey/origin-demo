import { useEffect, useState } from "react";
import type { OriginUserInfo, WidgetLoadStructuredContent } from "./widgetLoadTypes.js";

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

/**
 * Calls `widgetLoadInternalData` on the MCP server (production) or returns mock data (dev).
 */
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
        setData(devMockLoad(surface));
        setLoading(false);
        return;
      }

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
        const result = await mcpApp.callServerTool({
          name: "widgetLoadInternalData",
          arguments: { ...args, ...(toolName ? { toolName } : {}) },
        });
        if (cancelled) return;
        if (result.isError) {
          setError("Widget load failed");
          return;
        }
        const sc = result.structuredContent as WidgetLoadData | undefined;
        if (sc && typeof sc === "object" && "userInfo" in sc) {
          setData(sc);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
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
