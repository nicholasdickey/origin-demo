/**
 * Shared MCP App instance for production widget (single-file build).
 */
import { App } from "@modelcontextprotocol/ext-apps";

const _app = new App({
  name: "Origin By Genisent MCP App UI",
  version: "0.1.0",
});

async function withReconnect<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Not connected")) {
      await _app.connect();
      return await fn();
    }
    throw err;
  }
}

const REQUEST_METHODS = [
  "callServerTool",
  "requestDisplayMode",
  "openLink",
  "sendMessage",
  "updateModelContext",
] as const;

export const app = new Proxy(_app, {
  get(target, prop: string) {
    const value = (target as unknown as Record<string, unknown>)[prop];
    if (
      typeof value === "function" &&
      REQUEST_METHODS.includes(prop as (typeof REQUEST_METHODS)[number])
    ) {
      return (...args: unknown[]) =>
        withReconnect(() =>
          (value as (...a: unknown[]) => Promise<unknown>).apply(target, args),
        );
    }
    if (typeof value === "function") {
      return (value as (...a: unknown[]) => unknown).bind(target);
    }
    return value;
  },
});
