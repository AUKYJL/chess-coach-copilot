import { z } from "zod";

const passwordMinimumLength = 8;

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Введите имя."),
  email: z
    .string()
    .trim()
    .min(1, "Введите email.")
    .email("Введите корректный email."),
  password: z
    .string()
    .min(
      passwordMinimumLength,
      `Пароль должен содержать не меньше ${passwordMinimumLength} символов.`,
    ),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
