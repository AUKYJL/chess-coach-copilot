export const AUTHENTICATED_LANDING_PATH = "/students/demo-student";

export type AuthRedirectState = {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
};

export function getAuthRedirectPath(
  state: AuthRedirectState | null | undefined,
  fallbackPath = AUTHENTICATED_LANDING_PATH,
): string {
  const from = state?.from;

  return from
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : fallbackPath;
}
