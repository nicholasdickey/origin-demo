import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { authorizeMcpRequest } from "./mcpAuth.js";
import { createMcpAppsServer } from "./mcp_server/src/createMcpAppsServer.js";
import { probeFamilySearchIframeHeaders } from "./familysearchProbe.js";

const LOG = "[MCP server.ts]";

function logLine(event: string, detail: Record<string, unknown> = {}): void {
  console.log(
    LOG,
    event,
    JSON.stringify({ ...detail, t: new Date().toISOString() }),
  );
}

function sanitizeHeadersForLog(req: Request): Record<string, unknown> {
  return {
    accept: req.headers.accept,
    "content-type": req.headers["content-type"],
    "mcp-session-id": req.headers["mcp-session-id"],
    "mcp-protocol-version": req.headers["mcp-protocol-version"],
    authorization: req.headers.authorization ? "present" : "absent",
  };
}

const app = express();
app.use(cors());
app.use(express.json());

/** Probe FamilySearch response headers (why third-party iframes are blocked). */
app.get("/debug/familysearch-iframe", async (_req, res) => {
  try {
    const json = await probeFamilySearchIframeHeaders();
    res.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});

/** Smoke test / health: `curl -sS http://localhost:3001/mcp` */
app.get("/mcp", (_req, res) => {
  logLine("GET_smoke", {});
  res.json({
    ok: true,
    service: "Origin By Genisent MCP",
    hint: "POST JSON-RPC to this URL for the MCP protocol. Set API_KEY to require Bearer auth.",
  });
});

app.post("/mcp", async (req: Request, res: Response) => {
  logLine("POST_entry", {
    headers: sanitizeHeadersForLog(req),
  });

  const auth = authorizeMcpRequest(req.headers);
  if (auth.ok === false) {
    logLine("auth_failed", { status: auth.status, reason: auth.message });
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(auth.status).json({ error: auth.message });
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

    logLine("handleRequest_start", {
      bodyBytes: req.body ? Buffer.byteLength(JSON.stringify(req.body), "utf8") : 0,
    });

    await transport.handleRequest(req, res, req.body);

    logLine("handleRequest_done", { headersSent: res.headersSent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown internal error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(LOG, "Internal error:", message, stack);
    logLine("catch", { message, stack });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message },
      });
    }
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(PORT, (err?: Error) => {
  if (err) {
    console.error("Error starting Origin MCP App server:", err);
    process.exit(1);
  }
  console.log(`Origin MCP App server listening on http://localhost:${PORT}/mcp`);
  console.log(`  Smoke test: GET http://localhost:${PORT}/mcp`);
  console.log(
    `  FamilySearch iframe debug: GET http://localhost:${PORT}/debug/familysearch-iframe`,
  );
});
