import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import {
  REQUEST_FAILURE_KIND,
  fetchClient,
  getRequestFailureKind,
} from "@/shared/api";
import { cn } from "@/shared/lib/cn";
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

type LogoutButtonProps = {
  className?: string;
  buttonClassName?: string;
  fullWidth?: boolean;
};

export function LogoutButton({
  className,
  buttonClassName,
  fullWidth = true,
}: LogoutButtonProps = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {errorMessage ? <InlineAlert>{errorMessage}</InlineAlert> : null}
      <Button
        className={cn(fullWidth ? "w-full" : null, buttonClassName)}
        disabled={isSubmitting}
        onClick={async () => {
          setErrorMessage(null);
          setIsSubmitting(true);

          try {
            const result = await fetchClient.POST("/api/auth/logout");

            if (result.response.ok || result.response.status === 401) {
              terminateSession();
              queryClient.clear();
              await navigate({
                to: "/login",
                replace: true,
              });
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
