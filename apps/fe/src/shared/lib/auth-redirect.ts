export const AUTHENTICATED_LANDING_PATH = "/students";

export type AuthRedirectSearch = {
  redirect?: string;
};

export function getAuthRedirectPath(
  redirectPath: string | null | undefined,
  fallbackPath = AUTHENTICATED_LANDING_PATH,
): string {
  if (
    typeof redirectPath === "string" &&
    redirectPath.startsWith("/") &&
    !redirectPath.startsWith("//")
  ) {
    return redirectPath;
  }

  return fallbackPath;
}
