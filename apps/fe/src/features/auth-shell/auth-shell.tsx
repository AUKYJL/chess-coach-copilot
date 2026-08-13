import type * as React from "react";

import {
  Container,
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
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
                  {title}
                </Typography>
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY}
                >
                  {subtitle}
                </Typography>
              </div>
            </div>

            {children}

            {footer ? (
              <div className="pt-1 text-center">
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  {footer}
                </Typography>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}
