import { LoaderCircle } from "lucide-react";

import {
  Button,
  Container,
  InlineAlert,
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

export function AuthCheckingSplash({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <Container className="flex min-h-dvh items-start justify-center px-4 py-8 sm:px-6 sm:py-10 md:items-center md:py-14">
        <div className="w-full max-w-[420px]">
          <div className="border-border bg-surface space-y-6 rounded-[28px] border px-6 py-6 sm:px-7 sm:py-7">
            <div className="space-y-4">
              <Typography
                as={TYPOGRAPHY_AS.P}
                color={TYPOGRAPHY_COLOR.MUTED}
                variant={TYPOGRAPHY_VARIANT.OVERLINE}
              >
                Chess Coach Copilot
              </Typography>

              <div className="space-y-2">
                <Typography
                  as={TYPOGRAPHY_AS.H1}
                  variant={TYPOGRAPHY_VARIANT.H4}
                >
                  {error ? "Unable to restore your session" : "Checking your session..."}
                </Typography>
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY}
                >
                  {error
                    ? "We could not verify your workspace access. Try again."
                    : "Restoring your workspace access."}
                </Typography>
              </div>
            </div>

            {error ? (
              <InlineAlert>
                A temporary network or server issue interrupted session restore.
              </InlineAlert>
            ) : (
              <div
                aria-live="polite"
                className="border-divider bg-surface-subtle flex items-center gap-3 rounded-2xl border px-4 py-3"
                role="status"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="text-accent size-4 animate-spin"
                />
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  Restoring access...
                </Typography>
              </div>
            )}

            <Button
              className="w-full"
              onClick={onRetry}
              size="lg"
              type="button"
              variant={error ? "default" : "outline"}
            >
              Retry session check
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
