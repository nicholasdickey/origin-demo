import "./index.css";
import { createRoot } from "react-dom/client";
import { OriginApp } from "./origin/OriginApp.js";
import { addLog } from "./origin/originDebugLog.js";
import { setMcpConnectResult } from "./origin/originMcpConnectStatus.js";

async function main() {
  const el = document.getElementById("origin-root");
  if (!el) {
    throw new Error("Missing #origin-root");
  }

  if (import.meta.env.DEV) {
    const { installDevBootstrap } = await import("./dev/bootstrap.js");
    installDevBootstrap();
    addLog("Bootstrap: Vite dev — skipped app.connect, using mock load data", {
      dev: true,
    });
    createRoot(el).render(<OriginApp />);
    return;
  }

  const { app } = await import("./app-instance.js");
  try {
    await app.connect();
    setMcpConnectResult(true, null);
    addLog("MCP App.connect succeeded", { ok: true });
    console.log("[Origin] MCP App.connect succeeded");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setMcpConnectResult(false, msg);
    addLog("MCP App.connect failed", { error: msg });
    console.log("[Origin] MCP App.connect failed", msg);
    throw e;
  }
  createRoot(el).render(<OriginApp />);
}

void main();
