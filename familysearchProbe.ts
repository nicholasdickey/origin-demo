/** Shared URL — keep in sync with `src/config/familysearch.ts`. */
export const FAMILYSEARCH_IDENT_LOGIN_URL =
  "https://ident.familysearch.org/en/identity/login/?state=https://www.familysearch.org/en/united-states/";

export type FamilySearchIframeDebugPayload = {
  probedUrl: string;
  httpStatus: number;
  xFrameOptions: string | null;
  contentSecurityPolicy: string | null;
  frameAncestorsDirective: string | null;
  summary: string;
};

function extractFrameAncestorsDirective(csp: string | null): string | null {
  if (!csp) return null;
  const m = csp.match(/frame-ancestors\s+([^;]+)/i);
  return m ? m[1].trim() : null;
}

function summarizeEmbeddingBlock(
  xfo: string | null,
  frameAncestors: string | null,
): string {
  const parts: string[] = [];
  if (xfo) {
    parts.push(
      `X-Frame-Options: ${xfo} — framing is limited (e.g. SAMEORIGIN allows only the same registrable site to frame this document in many browsers).`,
    );
  }
  if (frameAncestors) {
    parts.push(
      `CSP frame-ancestors allows only: ${frameAncestors}. A widget on localhost, Vercel, or ChatGPT is not in this list unless FamilySearch adds it.`,
    );
  }
  if (parts.length === 0) {
    return "No X-Frame-Options / frame-ancestors parsed from response; inspect raw headers.";
  }
  parts.push(
    "The browser enforces this using FamilySearch’s response headers; your MCP app cannot override them for the iframe document.",
  );
  return parts.join(" ");
}

export async function probeFamilySearchIframeHeaders(): Promise<FamilySearchIframeDebugPayload> {
  const r = await fetch(FAMILYSEARCH_IDENT_LOGIN_URL, {
    method: "HEAD",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const csp = r.headers.get("content-security-policy");
  const xfo = r.headers.get("x-frame-options");
  const frameAncestors = extractFrameAncestorsDirective(csp);

  return {
    probedUrl: FAMILYSEARCH_IDENT_LOGIN_URL,
    httpStatus: r.status,
    xFrameOptions: xfo,
    contentSecurityPolicy: csp,
    frameAncestorsDirective: frameAncestors,
    summary: summarizeEmbeddingBlock(xfo, frameAncestors),
  };
}
