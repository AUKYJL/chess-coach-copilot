import { Navigate } from "react-router-dom";

import { bootstrapSession, SESSION_STATUS, useSessionStore } from "@/entities/session";

import { AUTHENTICATED_LANDING_PATH } from "../auth-redirect";
import { AuthCheckingSplash } from "../layouts";

export function RootRedirect() {
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
