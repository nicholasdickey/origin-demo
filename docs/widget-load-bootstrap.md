# Widget load: `_meta.bootstrap` vs `widgetLoadInternalData`

## Summary

- **Authoritative data** for the Origin MCP App widgets comes from the **`widgetLoadInternalData`** tool on the MCP server. It returns **`structuredContent`** (domain payload: dashboard projects, etc.) and **`_meta.userInfo`** (small header chrome aligned with ChatVault: name, anon flags, portal/login links from **`x-a6-*`** headers).
- **`_meta.bootstrap`** on the opening tool result (if used) should stay **small**: short flags, echoed LLM args, or a tiny snapshot. Do **not** put large JSON or full dashboard payloads only in `_meta` — hosts may log or cap tool metadata.
- **Iframe URL query strings** should stay **short** (surface id, opaque token). Avoid embedding large JSON in the URL (length limits ~2k–8k).

## Flow

1. Opening tool (`showOriginDashboard`, `showMockFamilySearchLogin`, `showMockEmailApproval`) completes → host loads the matching **`ui://…`** HTML bundle and may inject **`_meta`** / tool result into the iframe.
2. The widget calls **`widgetLoadInternalData`** with forwarded tool arguments (and optional **`toolName`** if **`x-a6-upstream-tool-slug`** is missing on nested calls).
3. The server branches on **`x-a6-upstream-tool-slug`** first, then optional **`toolName`** in arguments.

## References

- ChatVault `loadMyChats` / `userInfo` pattern (structured result + header-driven fields).
- Agentsyx gateway: **`x-a6-*`** headers on downstream MCP calls; **`x-a6-upstream-tool-slug`** set from `callMcpMethod` when upstream context is available.
