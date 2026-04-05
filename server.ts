import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import { createMcpAppsServer } from "./mcp_server/src/createMcpAppsServer.js";
import { probeFamilySearchIframeHeaders } from "./familysearchProbe.js";

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
  res.json({
    ok: true,
    service: "Origin By Genisent MCP",
    hint: "POST JSON-RPC to this URL for the MCP protocol.",
  });
});

app.post("/mcp", async (req, res) => {
  console.log("[MCP server.ts POST]", {
    accept: req.headers.accept,
    "content-type": req.headers["content-type"],
    bodyType: typeof req.body,
  });
  const server = createMcpAppsServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  console.log("[MCP server.ts POST done]", { headersSent: res.headersSent });
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
