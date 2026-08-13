import { z } from "zod";

const passwordMinimumLength = 8;

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(
      passwordMinimumLength,
      `Password must be at least ${passwordMinimumLength} characters.`,
    ),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
