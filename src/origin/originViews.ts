export type OriginView = "familyLogin" | "emailApproval";

/** Shown until host injects tool metadata (avoids flashing the wrong default view). */
export type ResolvedOriginView = OriginView | "pending";
