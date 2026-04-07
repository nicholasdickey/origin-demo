import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  buildUserInfoFromHeaders,
  buildWidgetLoadResult,
  resolveOpeningSlug,
  widgetLoadArgumentsSchema,
} from "./widgetLoadInternalData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

/** One immutable HTML bundle per surface (Agentsyx default = dashboard). */
export const ORIGIN_RESOURCE_URIS = {
  dashboard: "ui://origin-by-genisent/mcp-app-dashboard.html",
  familyLogin: "ui://origin-by-genisent/mcp-app-family.html",
  emailApproval: "ui://origin-by-genisent/mcp-app-email.html",
} as const;

const ASSET_FILES = {
  dashboard: "mcp-app-dashboard.html",
  familyLogin: "mcp-app-family.html",
  emailApproval: "mcp-app-email.html",
} as const;

const toolInputSchema = {
  note: z.string().optional(),
};

function getWidgetDomain(): string {
  return process.env.WIDGET_DOMAIN
    ? process.env.WIDGET_DOMAIN.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
      : "http://localhost:3001";
}

function readHeadersFromExtra(
  extra: { requestInfo?: { headers?: Record<string, string | string[] | undefined> } } | undefined,
): Record<string, string> | undefined {
  const raw = extra?.requestInfo?.headers;
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}

async function readWidgetHtml(assetFile: string): Promise<string> {
  const possiblePaths = [
    path.join(ASSETS_DIR, assetFile),
    path.join(process.cwd(), "assets", assetFile),
  ];

  let html: string | null = null;
  let lastError: Error | null = null;

  for (const htmlPath of possiblePaths) {
    try {
      html = await fs.readFile(htmlPath, "utf-8");
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (!html) {
    throw new Error(
      `Failed to find ${assetFile}. Tried: ${possiblePaths.join(", ")}. Last error: ${lastError?.message}`,
    );
  }
  return html;
}

/**
 * Create and configure the MCP Apps server for Origin By Genisent demo.
 *
 * - Three cached UI resources (dashboard default, FamilySearch mock, email mock).
 * - Opening tools each point at their own `ui://…` bundle.
 * - `widgetLoadInternalData` returns domain payload + `_meta.userInfo` (header chrome).
 */
export function createMcpAppsServer(): McpServer {
  const server = new McpServer({
    name: "Origin By Genisent MCP App",
    version: "0.1.0",
  });

  const widgetDomain = getWidgetDomain();
  // Match ChatVault: allow MCP App transport to Agentsyx upstream (callServerTool / JSON-RPC).
  // Without these, ChatGPT may block connections and widgetLoadInternalData never reaches the host.
  const widgetCSP = {
    connect_domains: [
      widgetDomain,
      "https://www.agentsyx.com",
      "https://agentsyx.com",
    ],
    resource_domains: [widgetDomain, "https://*.agentsyx.com"],
  };

  async function registerHtmlBundle(
    resourceUri: string,
    assetFile: string,
  ): Promise<void> {
    registerAppResource(
      server as unknown as Parameters<typeof registerAppResource>[0],
      resourceUri,
      resourceUri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => {
        const html = await readWidgetHtml(assetFile);
        return {
          contents: [
            {
              uri: resourceUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
              _meta: {
                "openai/outputTemplate": resourceUri,
                "openai/widgetPrefersBorder": true,
                "openai/widgetDomain": widgetDomain,
                "openai/widgetCSP": widgetCSP,
              },
            },
          ],
        };
      },
    );
  }

  void registerHtmlBundle(
    ORIGIN_RESOURCE_URIS.dashboard,
    ASSET_FILES.dashboard,
  );
  void registerHtmlBundle(
    ORIGIN_RESOURCE_URIS.familyLogin,
    ASSET_FILES.familyLogin,
  );
  void registerHtmlBundle(
    ORIGIN_RESOURCE_URIS.emailApproval,
    ASSET_FILES.emailApproval,
  );

  registerAppTool(
    server,
    "showOriginDashboard",
    {
      title: "Origin dashboard",
      description:
        "Open the Origin home dashboard: ongoing archive research projects and outstanding search threads (default Agentsyx app surface).",
      inputSchema: toolInputSchema,
      _meta: {
        ui: {
          resourceUri: ORIGIN_RESOURCE_URIS.dashboard,
        },
      },
    },
    async (args) => {
      console.log("[MCP] showOriginDashboard handler called", {
        argsKeys: args ? Object.keys(args) : [],
      });
      return {
        content: [
          {
            type: "text" as const,
            text: "Opened Origin dashboard — ongoing archive projects and threads.",
          },
        ],
        _meta: {
          ui: { resourceUri: ORIGIN_RESOURCE_URIS.dashboard },
          "ui/resourceUri": ORIGIN_RESOURCE_URIS.dashboard,
          view: "dashboard",
          toolName: "showOriginDashboard",
        },
      };
    },
  );

  registerAppTool(
    server,
    "showMockFamilySearchLogin",
    {
      title: "Mock FamilySearch login",
      description:
        "Open a simulated FamilySearch identity login screen in the widget (layout clone for demo; not the live site).",
      inputSchema: toolInputSchema,
      _meta: {
        ui: {
          resourceUri: ORIGIN_RESOURCE_URIS.familyLogin,
        },
      },
    },
    async (args) => {
      console.log("[MCP] showMockFamilySearchLogin handler called", {
        argsKeys: args ? Object.keys(args) : [],
      });
      return {
        content: [
          {
            type: "text" as const,
            text: "Opened simulated FamilySearch login view in the Origin widget.",
          },
        ],
        _meta: {
          ui: { resourceUri: ORIGIN_RESOURCE_URIS.familyLogin },
          "ui/resourceUri": ORIGIN_RESOURCE_URIS.familyLogin,
          view: "familyLogin",
          toolName: "showMockFamilySearchLogin",
        },
      };
    },
  );

  registerAppTool(
    server,
    "showMockEmailApproval",
    {
      title: "Review proposed archive email",
      description:
        "Open the widget to review a proposed email (Russian draft + English reference). Edit the draft if needed, then approve or cancel.",
      inputSchema: toolInputSchema,
      _meta: {
        ui: {
          resourceUri: ORIGIN_RESOURCE_URIS.emailApproval,
        },
      },
    },
    async (args) => {
      console.log("[MCP] showMockEmailApproval handler called", {
        argsKeys: args ? Object.keys(args) : [],
      });
      return {
        content: [
          {
            type: "text" as const,
            text: "Opened email review — please approve or edit the proposed message in the Origin widget.",
          },
        ],
        _meta: {
          ui: { resourceUri: ORIGIN_RESOURCE_URIS.emailApproval },
          "ui/resourceUri": ORIGIN_RESOURCE_URIS.emailApproval,
          view: "emailApproval",
          toolName: "showMockEmailApproval",
        },
      };
    },
  );

  server.registerTool(
    "widgetLoadInternalData",
    {
      title: "Load Origin widget data",
      description:
        "Authoritative data for the Origin MCP App widget: user header info from gateway headers and surface-specific payload. Prefer routing by x-a6-upstream-tool-slug.",
      inputSchema: widgetLoadArgumentsSchema,
    },
    async (args, extra) => {
      const parsed = widgetLoadArgumentsSchema.safeParse(args ?? {});
      const rawArgs = parsed.success ? parsed.data : {};
      const headers = readHeadersFromExtra(extra);
      const userInfo = buildUserInfoFromHeaders(headers);
      const upstreamSlug = resolveOpeningSlug(
        headers,
        typeof rawArgs.toolName === "string" ? rawArgs.toolName : undefined,
      );

      const { structuredContent, _meta, text } = buildWidgetLoadResult({
        upstreamSlug,
        userInfo,
      });

      console.log("[MCP] widgetLoadInternalData", {
        upstreamSlug,
        hasUserName: Boolean(userInfo.userName),
        isAnon: userInfo.isAnon,
      });

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
        _meta,
      };
    },
  );

  return server;
}
