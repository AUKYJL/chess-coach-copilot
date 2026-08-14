import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  REQUEST_FAILURE_KIND,
  fetchClient,
  getRequestFailureKind,
} from "@/shared/api";
import { InlineAlert } from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import { terminateSession } from "@/entities/session";

function getLogoutErrorMessage(status?: number, error?: unknown): string {
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
        size={BUTTON_SIZE.SM}
        variant={BUTTON_VARIANT.GHOST}
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
