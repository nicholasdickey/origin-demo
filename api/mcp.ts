import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMcpAppsServer } from "../mcp_server/src/createMcpAppsServer.js";

function getBearerTokenFromAuthHeader(
  header: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const match = raw.match(/^\s*Bearer\s+(.+)\s*$/i);
  return match?.[1] ?? null;
}

function isAuthorized(
  req: IncomingMessage,
): { ok: true } | { ok: false; status: number; message: string } {
  const expected = process.env.API_KEY;
  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: "Server misconfigured: missing API_KEY env var",
    };
  }
  const token = getBearerTokenFromAuthHeader(req.headers.authorization);
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Missing Authorization: Bearer <API_KEY>",
    };
  }
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Invalid API key" };
  }
  return { ok: true };
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

function logMcp(stage: string, detail: Record<string, unknown>) {
  console.log(
    `[MCP api/mcp] ${stage}`,
    JSON.stringify({ ...detail, t: new Date().toISOString() }),
  );
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = req.url ?? "";
  const hasAuth = Boolean(req.headers.authorization);
  const authScheme = req.headers.authorization?.split(/\s+/, 1)[0] ?? "";
  logMcp("request", {
    method: req.method,
    url,
    hasAuth,
    authScheme: hasAuth ? authScheme : undefined,
    accept: req.headers.accept,
    "content-type": req.headers["content-type"],
    "mcp-session-id": req.headers["mcp-session-id"],
    "mcp-protocol-version": req.headers["mcp-protocol-version"],
  });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, mcp-session-id, authorization",
  );

  if (req.method === "OPTIONS") {
    logMcp("OPTIONS", { status: 204 });
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET") {
    logMcp("GET smoke", { contentType: "application/json" });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(200);
    res.end(
      JSON.stringify({
        ok: true,
        service: "Origin By Genisent MCP",
        hint: "POST JSON-RPC to this URL for the MCP protocol (Authorization: Bearer required).",
      }),
    );
    return;
  }

  if (req.method !== "POST") {
    logMcp("method_not_allowed", { method: req.method });
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const auth = isAuthorized(req);
  if (auth.ok === false) {
    logMcp("auth_failed", {
      status: auth.status,
      reason: auth.message,
      apiKeyConfigured: Boolean(process.env.API_KEY),
    });
    res.setHeader("WWW-Authenticate", "Bearer");
    res.writeHead(auth.status);
    res.end(JSON.stringify({ error: auth.message }));
    return;
  }

  logMcp("auth_ok", {});

  try {
    const server = createMcpAppsServer();
    // ChatGPT / MCP Streamable HTTP clients expect SSE (Content-Type: text/event-stream).
    // enableJsonResponse: true breaks connectors that validate the response header.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      logMcp("res_close", {});
      transport.close();
    });
    await server.connect(transport);
    logMcp("server_connected", {});

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
    logMcp("handleRequest_start", {
      bodyBytes: Buffer.byteLength(requestBodyStr, "utf8"),
      bodyPreview: preview,
    });

    await transport.handleRequest(req, res, requestBody);

    logMcp("handleRequest_done", { headersSent: res.headersSent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown internal error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[MCP] Internal error in api/mcp handler:", message, stack);
    logMcp("catch", { message, stack });
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
