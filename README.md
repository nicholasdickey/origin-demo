# Origin By Genisent

Automate archive search and retrieval — MCP App with two tools: `showMockFamilySearchLogin` and `showMockEmailApproval`.

## Debugging: FamilySearch iframe is blank

FamilySearch’s identity page returns **`X-Frame-Options: SAMEORIGIN`** and a **CSP `frame-ancestors`** whitelist (only `*.familysearch.org` and a few partner hosts). Your widget origin (localhost, Vercel, ChatGPT, etc.) is **not** allowed to embed that URL in an iframe; the browser blocks it. This is not something the MCP server can fix.

With the local MCP server running (`pnpm serve:mcp-app`), open or fetch:

`GET http://localhost:3001/debug/familysearch-iframe`

You’ll get JSON with those headers and a short summary. The widget uses a layout clone instead of embedding that URL; the probe is for debugging headers only.

## Logo / branding

The widget header uses an inline SVG in [`src/origin/OriginLogo.tsx`](src/origin/OriginLogo.tsx) (document + magnifier). **ChatGPT share links** (for example [this page](https://chatgpt.com/s/m_69d28bd9011c819186a97e8554186cc9)) are normal web pages, not direct image URLs, so they cannot be used as `<img src="…">`. Export your image from the chat (download / save) and either replace the SVG in `OriginLogo.tsx` or import a PNG/WebP and render `<img src={logoUrl} alt="Origin By Genisent" />`.

## Develop (widget, HMR)

```bash
pnpm install
pnpm dev
```

Open the printed URL. Use `?view=familyLogin` or `?view=emailApproval`, or the dev strip. Add `?theme=dark` to preview dark styling (the widget follows `window.openai.theme` and host `data-theme` / `class="dark"` like ChatVault). Use `?anon=1` to show the **Login** header control, or `?user=YourName` for a logged-in label. `Ctrl+Alt+D` toggles a small debug JSON panel.

Header toolbar (like ChatVault): open SaaS site (`VITE_ORIGIN_SAAS_URL`, default `https://genisent.com`), optional login URL (`VITE_ORIGIN_LOGIN_URL`), logged-in name from `window.openai.widgetState`, and fullscreen via `requestDisplayMode`.

## Build widget + run MCP locally

```bash
pnpm build
pnpm serve:mcp-app
```

Smoke test: `curl -sS http://localhost:3001/mcp` (GET returns JSON). POST JSON-RPC to the same URL for MCP. **`API_KEY`** is optional: if unset, no Bearer required (same as open ChatGPT connectors). If set, send `Authorization: Bearer <API_KEY>`.

## Vercel

- **`API_KEY`** (optional): omit for public/no-auth MCP; set to require Bearer on `POST /mcp`.
- **`WIDGET_DOMAIN`** (optional): or rely on **`VERCEL_URL`** for widget metadata.
- Build command should run `pnpm build` / `vercel-build` so `assets/mcp-app.html` exists for the serverless function (`includeFiles`: `assets/**`).
- Streamable HTTP uses **`enableJsonResponse`** (JSON-RPC / JSON bodies, not SSE), matching ChatVault-style MCP servers. **GET** `/mcp` returns a small JSON smoke payload (no auth).
- If a ChatGPT build still complains about **`text/event-stream`** vs **`application/json`**, that is a connector mismatch with JSON Streamable HTTP—not a reason to drop JSON-RPC here; other JSON-RPC MCP apps (e.g. ChatVault) use the same pattern.

## Git remote

```bash
git remote add origin git@github.com:nicholasdickey/origin-demo.git
```
