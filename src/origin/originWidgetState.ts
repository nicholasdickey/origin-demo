/** Optional `window.openai.widgetState` shape for Origin header auth UI. */
export type OriginWidgetState = {
  userName?: string | null;
  /** When true, show “Login” instead of the user name. */
  isAnonymous?: boolean;
};
