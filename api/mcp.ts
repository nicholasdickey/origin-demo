import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { authorizeMcpRequest } from "../mcpAuth.js";
import { createMcpAppsServer } from "../mcp_server/src/createMcpAppsServer.js";

const LOG = "[MCP /api/mcp]";

function logLine(
  event: string,
  detail: Record<string, unknown> = {},
): void {
  console.log(
    LOG,
    event,
    JSON.stringify({ ...detail, t: new Date().toISOString() }),
  );
}

function sanitizeHeadersForLog(req: IncomingMessage): Record<string, unknown> {
  const h = req.headers;
  return {
    accept: h.accept,
    "content-type": h["content-type"],
    "mcp-session-id": h["mcp-session-id"],
    "mcp-protocol-version": h["mcp-protocol-version"],
    authorization: h.authorization ? "present" : "absent",
  };
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = req.url ?? "";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, mcp-session-id, authorization",
  );

  if (req.method === "OPTIONS") {
    logLine("OPTIONS", { status: 204 });
    res.writeHead(204);
    res.end();
    return;
  }

  /** Public smoke / health (browser or curl). MCP JSON-RPC is POST only. */
  if (req.method === "GET") {
    logLine("GET_smoke", { url });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(200);
    res.end(
      JSON.stringify({
        ok: true,
        service: "Origin By Genisent MCP",
        hint:
          "POST JSON-RPC to this URL for the MCP protocol. Set API_KEY on the server to require Bearer auth.",
      }),
    );
    return;
  }

  if (req.method !== "POST") {
    logLine("not_found", { method: req.method, url });
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  logLine("POST_entry", {
    url,
    headers: sanitizeHeadersForLog(req),
  });

  const auth = authorizeMcpRequest(req.headers);
  if (auth.ok === false) {
    logLine("auth_failed", {
      status: auth.status,
      reason: auth.message,
    });
    res.setHeader("WWW-Authenticate", "Bearer");
    res.writeHead(auth.status);
    res.end(JSON.stringify({ error: auth.message }));
    return;
  }
  logLine("auth_ok", { mode: auth.mode });

  try {
    const server = createMcpAppsServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      logLine("res_close", {});
      transport.close();
    });
    await server.connect(transport);
    logLine("server_connected", {});

    const requestBodyStr = await readRequestBody(req);
    let requestBody: unknown = undefined;
    if (requestBodyStr.length > 0) {
      try {
        requestBody = JSON.parse(requestBodyStr);
      } catch {
        requestBody = requestBodyStr;
      }
    }

    const preview =
      requestBodyStr.length > 500
        ? `${requestBodyStr.slice(0, 500)}…`
        : requestBodyStr;
    logLine("handleRequest_start", {
      bodyBytes: Buffer.byteLength(requestBodyStr, "utf8"),
      bodyPreview: preview,
    });

    await transport.handleRequest(req, res, requestBody);

    logLine("handleRequest_done", { headersSent: res.headersSent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown internal error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(LOG, "Internal error:", message, stack);
    logLine("catch", { message, stack });
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message },
      }),
    );
  }
}
