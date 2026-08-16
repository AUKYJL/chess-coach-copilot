import type * as React from "react";

import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
} from "./typography";
import { Typography } from "./typography/typography";

type InlineAlertProps = {
  children: React.ReactNode;
  tone?: "danger" | "success";
};

export function InlineAlert({ children, tone = "danger" }: InlineAlertProps) {
  return (
    <div
      aria-live="polite"
      className={
        tone === "success"
          ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
          : "border-danger/20 bg-danger-soft rounded-2xl border px-4 py-3"
      }
      role="alert"
    >
      <Typography
        as={TYPOGRAPHY_AS.P}
        color={
          tone === "success"
            ? TYPOGRAPHY_COLOR.SUCCESS
            : TYPOGRAPHY_COLOR.DANGER
        }
        variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
      >
        {children}
      </Typography>
    </div>
  );
}
