import { z } from "zod";

const passwordMinimumLength = 8;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Введите email.")
    .email("Введите корректный email."),
  password: z
    .string()
    .min(1, "Введите пароль.")
    .min(
      passwordMinimumLength,
      `Пароль должен содержать не меньше ${passwordMinimumLength} символов.`,
    ),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
