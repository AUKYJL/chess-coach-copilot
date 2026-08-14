import * as React from "react";

import { cn } from "@/shared/lib/cn";

const containerSizeClasses = {
  default: "max-w-[1280px]",
  workspace: "max-w-[1520px]",
} as const;

type ContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  size?: keyof typeof containerSizeClasses;
};

function Container({
  className,
  size = "default",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full", containerSizeClasses[size], className)}
      {...props}
    />
  );
}

export { Container };
