import "./index.css";
import { createRoot } from "react-dom/client";
import { OriginApp } from "./origin/OriginApp.js";

async function main() {
  const el = document.getElementById("origin-root");
  if (!el) {
    throw new Error("Missing #origin-root");
  }

  if (import.meta.env.DEV) {
    const { installDevBootstrap } = await import("./dev/bootstrap.js");
    installDevBootstrap();
    createRoot(el).render(<OriginApp />);
    return;
  }

  const { app } = await import("./app-instance.js");
  await app.connect();
  createRoot(el).render(<OriginApp />);
}

void main();
