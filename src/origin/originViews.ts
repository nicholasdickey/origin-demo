export type OriginView = "dashboard" | "familyLogin" | "emailApproval";

/** Shown until host injects tool metadata (avoids flashing the wrong default view). */
export type ResolvedOriginView = OriginView | "pending";

/**
 * Host may set `view` on the payload or under `_meta` (MCP tool result `_meta.view`).
 */
export function parseViewFromHostPayload(
  payload: unknown,
): OriginView | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const o = payload as Record<string, unknown>;
  const direct = o.view;
  if (
    direct === "dashboard" ||
    direct === "familyLogin" ||
    direct === "emailApproval"
  ) {
    return direct;
  }
  const meta = o._meta;
  if (meta && typeof meta === "object") {
    const v = (meta as Record<string, unknown>).view;
    if (
      v === "dashboard" ||
      v === "familyLogin" ||
      v === "emailApproval"
    ) {
      return v;
    }
  }
  return undefined;
}

/** When the host sets the active tool name before structured output arrives. */
export function parseViewFromToolInput(input: unknown): OriginView | undefined {
  if (!input || typeof input !== "object") return undefined;
  const o = input as Record<string, unknown>;
  const name =
    typeof o.name === "string"
      ? o.name
      : typeof o.toolName === "string"
        ? o.toolName
        : typeof o.tool === "string"
          ? o.tool
          : undefined;
  if (name === "showMockEmailApproval") return "emailApproval";
  if (name === "showMockFamilySearchLogin") return "familyLogin";
  if (name === "showOriginDashboard") return "dashboard";
  return undefined;
}

export function parseSurfaceFromBundle(): OriginView | undefined {
  const s = import.meta.env.VITE_ORIGIN_SURFACE;
  if (s === "dashboard" || s === "familyLogin" || s === "emailApproval") {
    return s;
  }
  return undefined;
}
