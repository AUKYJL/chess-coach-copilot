import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { terminateSession } from "@/entities/session";
import {
  fetchClient,
  getRequestFailureKind,
  REQUEST_FAILURE_KIND,
} from "@/shared/api";
import { Button, InlineAlert } from "@/shared/ui";

function getLogoutErrorMessage(
  status?: number,
  error?: unknown,
): string {
  const failureKind = getRequestFailureKind({ error, status });

  switch (failureKind) {
    case REQUEST_FAILURE_KIND.NETWORK:
      return "Unable to reach the server. Sign out was not completed.";
    case REQUEST_FAILURE_KIND.SERVER:
      return "The server could not complete sign out. Try again.";
    case REQUEST_FAILURE_KIND.AUTH:
    case REQUEST_FAILURE_KIND.CONFLICT:
    case REQUEST_FAILURE_KIND.UNKNOWN:
      return "Sign out did not complete. Try again.";
  }

  const exhaustiveCheck: never = failureKind;
  return exhaustiveCheck;
}

export function LogoutButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="space-y-3">
      {errorMessage ? <InlineAlert>{errorMessage}</InlineAlert> : null}
      <Button
        className="w-full"
        disabled={isSubmitting}
        onClick={async () => {
          setErrorMessage(null);
          setIsSubmitting(true);

          try {
            const result = await fetchClient.POST("/api/auth/logout");

            if (result.response.ok || result.response.status === 401) {
              terminateSession();
              queryClient.clear();
              await navigate("/login", { replace: true });
              return;
            }

            setErrorMessage(getLogoutErrorMessage(result.response.status));
          } catch (error) {
            setErrorMessage(getLogoutErrorMessage(undefined, error));
          } finally {
            setIsSubmitting(false);
          }
        }}
        size="sm"
        variant="ghost"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Signing out…
          </>
        ) : (
          "Sign out"
        )}
      </Button>
    </div>
  );
}
