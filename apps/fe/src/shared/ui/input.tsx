import * as React from "react";

import { cn } from "@/shared/lib/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/25 aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/20 flex h-11 w-full rounded-2xl border px-4 py-2 text-sm shadow-sm transition-colors outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
