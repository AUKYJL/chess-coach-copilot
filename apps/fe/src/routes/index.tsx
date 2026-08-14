/* oxlint-disable react/only-export-components */
/* oxlint-disable react/only-export-components */
import { Navigate, createFileRoute } from "@tanstack/react-router";

import { AUTHENTICATED_LANDING_PATH } from "@/shared/lib/auth-redirect";

import { AuthCheckingSplash } from "@/app/layouts";
import {
  SESSION_STATUS,
  bootstrapSession,
  useSessionStore,
} from "@/entities/session";

export const Route = createFileRoute("/")({
  component: RootIndexRoute,
});

function retrySessionCheck() {
  bootstrapSession().catch((error) => {
    const normalizedError =
      error instanceof Error ? error : new Error("Session bootstrap failed.");

    console.error("Session bootstrap failed.", normalizedError);
  });
}

function RootIndexRoute() {
  const status = useSessionStore((state) => state.status);
  const bootstrapError = useSessionStore((state) => state.bootstrapError);

  if (status === SESSION_STATUS.CHECKING) {
    return (
      <AuthCheckingSplash error={bootstrapError} onRetry={retrySessionCheck} />
    );
  }

  return (
    <Navigate
      replace
      to={
        status === SESSION_STATUS.UNAUTHENTICATED
          ? "/login"
          : AUTHENTICATED_LANDING_PATH
      }
    />
  );
}
