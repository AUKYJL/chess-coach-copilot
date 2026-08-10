import * as React from "react";

import { cn } from "@/shared/lib/cn";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent/25 flex min-h-28 w-full rounded-[24px] border px-4 py-3 text-sm shadow-sm transition-colors outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
