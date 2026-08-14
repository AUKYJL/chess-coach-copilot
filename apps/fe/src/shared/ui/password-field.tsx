import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "./button";
import { Input } from "./input";

const PasswordField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(({ className, disabled, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        className={cn("pr-12", className)}
        disabled={disabled}
        type={visible ? "text" : "password"}
      />

      <Button
        type="button"
        variant={BUTTON_VARIANT.GHOST}
        size={BUTTON_SIZE.ICON}
        className="absolute top-1 right-1 size-9 rounded-xl"
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  );
});

PasswordField.displayName = "PasswordField";

export { PasswordField };
