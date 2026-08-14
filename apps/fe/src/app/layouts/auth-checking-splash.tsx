import { LoaderCircle } from "lucide-react";

import {
  Container,
  InlineAlert,
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

type AuthCheckingSplashProps = {
  error: Error | null;
  onRetry: () => void;
};

export function AuthCheckingSplash({
  error,
  onRetry,
}: AuthCheckingSplashProps) {
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
                  {error
                    ? "Не удалось восстановить сессию"
                    : "Проверяем сессию..."}
                </Typography>
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY}
                >
                  {error
                    ? "Не удалось подтвердить доступ к рабочему пространству. Попробуйте ещё раз."
                    : "Восстанавливаем доступ к рабочему пространству."}
                </Typography>
              </div>
            </div>

            {error ? (
              <InlineAlert>
                Восстановление сессии прервалось из-за временной ошибки сети или
                сервера.
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
                  Восстанавливаем доступ...
                </Typography>
              </div>
            )}

            <Button
              className="w-full"
              onClick={onRetry}
              size={BUTTON_SIZE.LG}
              type="button"
              variant={error ? BUTTON_VARIANT.DEFAULT : BUTTON_VARIANT.OUTLINE}
            >
              Повторить проверку сессии
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
