export const REFRESH_STATUS = {
  REFRESHED: "refreshed",
  RETRYABLE_ERROR: "retryable-error",
  UNAUTHENTICATED: "unauthenticated",
} as const;

export type RefreshStatus =
  (typeof REFRESH_STATUS)[keyof typeof REFRESH_STATUS];
