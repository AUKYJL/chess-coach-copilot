import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  REQUEST_FAILURE_KIND,
  fetchClient,
  getRequestFailureKind,
} from "@/shared/api";
import {
  AUTHENTICATED_LANDING_PATH,
  getAuthRedirectPath,
} from "@/shared/lib/auth-redirect";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  InlineAlert,
  Input,
  PasswordField,
} from "@/shared/ui";
import { BUTTON_SIZE, Button } from "@/shared/ui/button";

import { type LoginFormValues, loginSchema } from "../model";

import { applyAuthenticatedSession } from "@/entities/session";

function getLoginErrorMessage(status?: number, error?: unknown): string {
  const failureKind = getRequestFailureKind({ error, status });

  switch (failureKind) {
    case REQUEST_FAILURE_KIND.AUTH:
      return "Неверный email или пароль.";
    case REQUEST_FAILURE_KIND.NETWORK:
      return "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.";
    case REQUEST_FAILURE_KIND.SERVER:
      return "Сервер не смог выполнить вход. Попробуйте ещё раз.";
    case REQUEST_FAILURE_KIND.CONFLICT:
    case REQUEST_FAILURE_KIND.UNKNOWN:
      return "Сейчас не удалось войти. Попробуйте ещё раз.";
  }

  const exhaustiveCheck: never = failureKind;
  return exhaustiveCheck;
}

type LoginFormProps = {
  redirectPath?: string;
};

export function LoginForm({ redirectPath }: LoginFormProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form
        noValidate
        aria-busy={isSubmitting}
        className="space-y-4"
        onChange={() => {
          if (submissionError) {
            setSubmissionError(null);
          }
        }}
        onSubmit={form.handleSubmit(async (values) => {
          setSubmissionError(null);
          setIsSubmitting(true);

          try {
            const result = await fetchClient.POST("/api/auth/login", {
              body: values,
            });

            if (!result.response.ok || !result.data) {
              setSubmissionError(getLoginErrorMessage(result.response.status));
              return;
            }

            applyAuthenticatedSession(result.data);
            const nextPath = getAuthRedirectPath(redirectPath);

            if (nextPath === AUTHENTICATED_LANDING_PATH) {
              await navigate({
                to: AUTHENTICATED_LANDING_PATH,
                replace: true,
              });

              return;
            }

            router.history.push(nextPath);
          } catch (error) {
            setSubmissionError(getLoginErrorMessage(undefined, error));
          } finally {
            setIsSubmitting(false);
          }
        })}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="email"
                  disabled={isSubmitting}
                  placeholder="coach@example.com"
                  type="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <PasswordField
                  {...field}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  placeholder="Введите пароль"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submissionError ? <InlineAlert>{submissionError}</InlineAlert> : null}

        <Button
          className="w-full"
          disabled={isSubmitting}
          size={BUTTON_SIZE.LG}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Входим...
            </>
          ) : (
            "Войти"
          )}
        </Button>
      </form>
    </Form>
  );
}
