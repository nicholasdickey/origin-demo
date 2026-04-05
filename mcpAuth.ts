import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export function getBearerTokenFromAuthHeader(
  header: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const match = raw.match(/^\s*Bearer\s+(.+)\s*$/i);
  return match?.[1] ?? null;
}

/**
 * Optional Bearer auth: if `API_KEY` is unset or empty, allow all requests.
 * If set, require `Authorization: Bearer <API_KEY>` with timing-safe compare.
 */
export function authorizeMcpRequest(headers: IncomingHttpHeaders): {
  ok: true;
  mode: "open" | "bearer";
} | {
  ok: false;
  status: number;
  message: string;
} {
  const expected = process.env.API_KEY?.trim();
  if (!expected) {
    return { ok: true, mode: "open" };
  }
  const token = getBearerTokenFromAuthHeader(headers.authorization);
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Missing Authorization: Bearer <API_KEY>",
    };
  }
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Invalid API key" };
  }
  return { ok: true, mode: "bearer" };
}
