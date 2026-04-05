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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

export function getWidgetDomain(): string {
  if (process.env.WIDGET_DOMAIN) {
    return process.env.WIDGET_DOMAIN.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3001";
}

/**
 * MCP Apps server: two mock tools + single widget HTML resource.
 */
export function createMcpAppsServer(): McpServer {
  const server = new McpServer({
    name: "Origin By Genisent MCP App",
    version: "0.1.0",
  });

  const resourceUri = "ui://origin-by-genisent/mcp-app.html";
  const widgetDomain = getWidgetDomain();

  const toolInputSchema = {
    note: z.string().optional(),
  };

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
          resourceUri,
        },
      },
    },
    async () => {
      console.log("[MCP] showMockFamilySearchLogin");
      return {
        content: [
          {
            type: "text" as const,
            text: "Opened simulated FamilySearch login view in the Origin widget.",
          },
        ],
        _meta: {
          ui: { resourceUri },
          "ui/resourceUri": resourceUri,
          view: "familyLogin",
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
          resourceUri,
        },
      },
    },
    async () => {
      console.log("[MCP] showMockEmailApproval");
      return {
        content: [
          {
            type: "text" as const,
            text: "Opened email review — please approve or edit the proposed message in the Origin widget.",
          },
        ],
        _meta: {
          ui: { resourceUri },
          "ui/resourceUri": resourceUri,
          view: "emailApproval",
        },
      };
    },
  );

  const widgetCSP = {
    connect_domains: [widgetDomain],
    resource_domains: [widgetDomain],
  };

  registerAppResource(
    server as unknown as Parameters<typeof registerAppResource>[0],
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const possiblePaths = [
        path.join(ASSETS_DIR, "mcp-app.html"),
        path.join(process.cwd(), "assets", "mcp-app.html"),
      ];

      let html: string | null = null;
      let lastError: Error | null = null;

      for (const htmlPath of possiblePaths) {
        try {
          html = await fs.readFile(htmlPath, "utf-8");
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
      }

      if (!html) {
        throw new Error(
          `Failed to find mcp-app.html. Tried: ${possiblePaths.join(", ")}. Last error: ${lastError?.message}`,
        );
      }

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

  return server;
}
