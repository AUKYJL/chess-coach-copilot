import type * as React from "react";

import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
} from "./typography";
import { Typography } from "./typography/typography";

type InlineAlertProps = {
  children: React.ReactNode;
};

export function InlineAlert({ children }: InlineAlertProps) {
  return (
    <div
      aria-live="polite"
      className="border-danger/20 bg-danger-soft rounded-2xl border px-4 py-3"
      role="alert"
    >
      <Typography
        as={TYPOGRAPHY_AS.P}
        color={TYPOGRAPHY_COLOR.DANGER}
        variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
      >
        {children}
      </Typography>
    </div>
  );
}
