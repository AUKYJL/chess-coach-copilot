/* oxlint-disable react/only-export-components */
/* oxlint-disable react/only-export-components */
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell, AuthCheckingSplash } from "@/app/layouts";
import {
  SESSION_STATUS,
  bootstrapSession,
  useSessionStore,
} from "@/entities/session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const status = useSessionStore.getState().status;

    if (status === SESSION_STATUS.UNAUTHENTICATED) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
        replace: true,
      });
    }
  },
  component: AuthenticatedLayout,
});

function retrySessionCheck() {
  bootstrapSession().catch((error) => {
    const normalizedError =
      error instanceof Error ? error : new Error("Session bootstrap failed.");

    console.error("Session bootstrap failed.", normalizedError);
  });
}

function AuthenticatedLayout() {
  const status = useSessionStore((state) => state.status);
  const bootstrapError = useSessionStore((state) => state.bootstrapError);

  if (status === SESSION_STATUS.CHECKING) {
    return (
      <AuthCheckingSplash error={bootstrapError} onRetry={retrySessionCheck} />
    );
  }

  if (status !== SESSION_STATUS.AUTHENTICATED) {
    return null;
  }

  return <AppShell />;
}
