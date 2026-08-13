import { z } from "zod";

const passwordMinimumLength = 8;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(
      passwordMinimumLength,
      `Password must be at least ${passwordMinimumLength} characters.`,
    ),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
