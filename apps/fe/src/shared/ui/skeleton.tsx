import type * as React from "react";

import { cn } from "@/shared/lib/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-surface-card/90 animate-pulse rounded-2xl", className)}
      {...props}
    />
  );
}

export { Skeleton };
