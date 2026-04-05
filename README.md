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

Smoke test: `curl -sS http://localhost:3001/mcp` (GET returns JSON). POST JSON-RPC to the same URL for MCP (no API key locally).

## Vercel

- Set **API_KEY** and optionally **WIDGET_DOMAIN** (or rely on **VERCEL_URL**).
- Build command should run `pnpm build` / `vercel-build` so `assets/mcp-app.html` exists for the serverless function (`includeFiles`: `assets/**`).
- The serverless handler matches ChatVault: **POST only**, Streamable HTTP with **`enableJsonResponse`** (JSON bodies, not SSE). For a quick **GET** smoke response, use the local dev server (`pnpm serve:mcp-app` → `curl` GET `/mcp`).

## Git remote

```bash
git remote add origin git@github.com:nicholasdickey/origin-demo.git
```
