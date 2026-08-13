import { Navigate, Outlet, useLocation } from "react-router-dom";

import { bootstrapSession, SESSION_STATUS, useSessionStore } from "@/entities/session";
import type { AuthRedirectState } from "@/shared/lib/auth-redirect";

import { AuthCheckingSplash } from "./auth-checking-splash";

export function ProtectedLayout() {
  const location = useLocation();
  const status = useSessionStore((state) => state.status);
  const bootstrapError = useSessionStore((state) => state.bootstrapError);

  if (status === SESSION_STATUS.CHECKING) {
    return (
      <AuthCheckingSplash
        error={bootstrapError}
        onRetry={() => {
          bootstrapSession().catch((error) => {
            const normalizedError =
              error instanceof Error
                ? error
                : new Error("Session bootstrap failed.");

            console.error("Session bootstrap failed.", normalizedError);
          });
        }}
      />
    );
  }

  if (status === SESSION_STATUS.UNAUTHENTICATED) {
    const redirectState = {
      from: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
    } satisfies AuthRedirectState;

    return (
      <Navigate
        replace
        state={redirectState}
        to="/login"
      />
    );
  }

  return <Outlet />;
}
