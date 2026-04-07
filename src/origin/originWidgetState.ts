/** Optional `window.openai.widgetState` shape for Origin header auth UI. */
export type OriginWidgetState = {
  userName?: string | null;
  /** When true, show “Login” instead of the user name. */
  isAnonymous?: boolean;
  portalLink?: string | null;
  loginLink?: string | null;
  /** Anonymous (free) plan — show sign-in / slots like ChatVault when applicable. */
  isAnonymousPlan?: boolean;
  remainingSlots?: number;
};
