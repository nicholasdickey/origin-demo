# Origin By Genisent — MCP App demo

Mock MCP App with two tools: `showMockFamilySearchLogin` and `showMockEmailApproval`.

## Develop (widget, HMR)

```bash
pnpm install
pnpm dev
```

Open the printed URL. Use `?view=familyLogin` or `?view=emailApproval`, or the dev strip. `Ctrl+Alt+D` toggles a small debug JSON panel.

## Build widget + run MCP locally

```bash
pnpm build
pnpm serve:mcp-app
```

POST JSON-RPC to `http://localhost:3001/mcp` (no API key locally).

## Vercel

- Set **API_KEY** and optionally **WIDGET_DOMAIN** (or rely on **VERCEL_URL**).
- Build command should run `pnpm build` / `vercel-build` so `assets/mcp-app.html` exists for the serverless function (`includeFiles`: `assets/**`).

## Git remote

```bash
git remote add origin git@github.com:nicholasdickey/origin-demo.git
```
