/** Marketing / SaaS site (open in browser from widget header). */
export const ORIGIN_SAAS_URL =
  import.meta.env.VITE_ORIGIN_SAAS_URL ?? "https://genisent.com";

/** Account login on the SaaS (or IdP) — used by “Login” when anonymous. */
export const ORIGIN_LOGIN_URL =
  import.meta.env.VITE_ORIGIN_LOGIN_URL ?? `${ORIGIN_SAAS_URL.replace(/\/$/, "")}/login`;
