import * as React from "react";

import { cn } from "@/shared/lib/cn";

function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1280px]", className)}
      {...props}
    />
  );
}

export { Container };
