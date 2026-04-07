/**
 * Shared logic for the widgetLoadInternalData MCP tool:
 * dispatch by x-a6-upstream-tool-slug, userInfo from x-a6-* headers (ChatVault-style).
 */

import { z } from "zod";
import type {
  ArchiveProject,
  OriginUserInfo,
  WidgetLoadStructuredContent,
} from "../../src/origin/widgetLoadTypes.js";

export type {
  ArchiveProject,
  ArchiveThread,
  OriginUserInfo,
  WidgetLoadStructuredContent,
} from "../../src/origin/widgetLoadTypes.js";

const OPENING_SLUGS = {
  dashboard: "showOriginDashboard",
  familyLogin: "showMockFamilySearchLogin",
  emailApproval: "showMockEmailApproval",
} as const;

function firstHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower && typeof v === "string" && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

function parseBool(h: string | undefined): boolean | undefined {
  if (h === undefined) return undefined;
  if (h === "true") return true;
  if (h === "false") return false;
  return undefined;
}

/** Build userInfo from Agentsyx / gateway x-a6-* headers (trusted). */
export function buildUserInfoFromHeaders(
  headers: Record<string, string> | undefined,
): OriginUserInfo {
  const portalLink = firstHeader(headers, "x-a6-portal-link") ?? null;
  const loginLink = firstHeader(headers, "x-a6-login-link") ?? null;
  const isAnon = parseBool(firstHeader(headers, "x-a6-is-anon-user")) ?? false;
  const isAnonymousPlan = parseBool(
    firstHeader(headers, "x-a6-anonymous-subscription"),
  );
  const userName = firstHeader(headers, "x-a6-username") ?? null;

  return {
    portalLink,
    loginLink,
    isAnon,
    ...(isAnonymousPlan !== undefined && { isAnonymousPlan }),
    userName,
  };
}

function mockDashboardProjects(): ArchiveProject[] {
  return [
    {
      id: "proj-psk-1874",
      title: "Pskov civil registers — Vasiliy Nikolayevich (1874)",
      status: "In progress",
      threads: [
        {
          id: "th-1",
          state: "running",
          data: "Birth metric search — Pskov uyezd",
          waitingOn: "Archive response window",
        },
        {
          id: "th-2",
          state: "blocked",
          data: "Duplicate request check",
          waitingOn: "User: confirm spelling of patronymic",
        },
      ],
    },
    {
      id: "proj-riga",
      title: "Riga revision lists — family cluster",
      status: "Queued",
      threads: [
        {
          id: "th-3",
          state: "done",
          data: "Initial index pass",
          waitingOn: "—",
        },
      ],
    },
  ];
}

export function resolveOpeningSlug(
  headers: Record<string, string> | undefined,
  argsToolName: string | undefined,
): string | undefined {
  const fromHeader =
    firstHeader(headers, "x-a6-upstream-tool-slug") ??
    firstHeader(headers, "X-A6-Upstream-Tool-Slug");
  if (fromHeader && fromHeader.length > 0) return fromHeader;
  if (argsToolName && argsToolName.length > 0) return argsToolName;
  return undefined;
}

export function buildWidgetLoadResult(params: {
  upstreamSlug: string | undefined;
  userInfo: OriginUserInfo;
}): {
  structuredContent: WidgetLoadStructuredContent & { userInfo: OriginUserInfo };
  _meta: { userInfo: OriginUserInfo };
  text: string;
} {
  const { upstreamSlug, userInfo } = params;

  let structured: WidgetLoadStructuredContent;
  let text: string;

  if (
    upstreamSlug === OPENING_SLUGS.dashboard ||
    upstreamSlug === "showOriginDashboard"
  ) {
    structured = { surface: "dashboard", projects: mockDashboardProjects() };
    text = "Loaded Origin dashboard (archive projects).";
  } else if (
    upstreamSlug === OPENING_SLUGS.familyLogin ||
    upstreamSlug === "showMockFamilySearchLogin"
  ) {
    structured = {
      surface: "familyLogin",
      message: "FamilySearch login mock surface.",
    };
    text = "Loaded FamilySearch login mock.";
  } else if (
    upstreamSlug === OPENING_SLUGS.emailApproval ||
    upstreamSlug === "showMockEmailApproval"
  ) {
    structured = {
      surface: "emailApproval",
      message: "Email approval mock surface.",
    };
    text = "Loaded email approval mock.";
  } else {
    structured = { surface: "dashboard", projects: mockDashboardProjects() };
    text = "Loaded default dashboard (unknown upstream slug).";
  }

  const structuredContent = {
    ...structured,
    userInfo,
  };

  return {
    structuredContent,
    _meta: { userInfo },
    text,
  };
}

export const widgetLoadArgumentsSchema = z
  .object({
    /** Echo of opening tool name if upstream slug header is missing (nested calls). */
    toolName: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

export type WidgetLoadArguments = z.infer<typeof widgetLoadArgumentsSchema>;
