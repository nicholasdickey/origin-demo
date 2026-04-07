/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of MCP server for debug probes (e.g. http://localhost:3001). */
  readonly VITE_MCP_ORIGIN?: string;
  /** SaaS / marketing site opened from the widget header. */
  readonly VITE_ORIGIN_SAAS_URL?: string;
  /** Login URL for “Login” when the user is anonymous. */
  readonly VITE_ORIGIN_LOGIN_URL?: string;
  /** Which single-file MCP bundle this build is (`dashboard` | `familyLogin` | `emailApproval`). */
  readonly VITE_ORIGIN_SURFACE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
