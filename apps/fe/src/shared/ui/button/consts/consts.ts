export const BUTTON_VARIANT = {
  DEFAULT: "default",
  SECONDARY: "secondary",
  OUTLINE: "outline",
  GHOST: "ghost",
  DESTRUCTIVE: "destructive",
} as const;

export type ButtonVariant =
  (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const BUTTON_SIZE = {
  DEFAULT: "default",
  SM: "sm",
  LG: "lg",
  ICON: "icon",
} as const;

export type ButtonSize = (typeof BUTTON_SIZE)[keyof typeof BUTTON_SIZE];
