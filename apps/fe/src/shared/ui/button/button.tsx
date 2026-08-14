import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  type ButtonSize,
  type ButtonVariant,
} from "./consts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        [BUTTON_VARIANT.DEFAULT]:
          "bg-button-primary text-button-primary-foreground shadow-[0_10px_24px_-18px_rgba(39,48,60,0.65)] hover:bg-button-primary-hover",
        [BUTTON_VARIANT.SECONDARY]:
          "bg-surface-card text-foreground hover:bg-surface-subtle",
        [BUTTON_VARIANT.OUTLINE]:
          "border border-border bg-surface text-foreground hover:bg-surface-subtle",
        [BUTTON_VARIANT.GHOST]:
          "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
        [BUTTON_VARIANT.DESTRUCTIVE]: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        [BUTTON_SIZE.DEFAULT]: "h-10 px-4 py-2",
        [BUTTON_SIZE.SM]: "h-9 rounded-xl px-3",
        [BUTTON_SIZE.LG]: "h-11 rounded-2xl px-5",
        [BUTTON_SIZE.ICON]: "size-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: BUTTON_VARIANT.DEFAULT,
      size: BUTTON_SIZE.DEFAULT,
    },
  },
);

type ButtonOwnProps = {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export type ButtonProps = React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, keyof ButtonOwnProps> &
  ButtonOwnProps;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = BUTTON_VARIANT.DEFAULT,
      size = BUTTON_SIZE.DEFAULT,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
