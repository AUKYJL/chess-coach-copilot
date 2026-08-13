import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Location } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { applyAuthenticatedSession } from "@/entities/session";
import {
  fetchClient,
  getRequestFailureKind,
  REQUEST_FAILURE_KIND,
} from "@/shared/api";
import {
  getAuthRedirectPath,
  type AuthRedirectState,
} from "@/shared/lib/auth-redirect";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InlineAlert,
  PasswordField,
} from "@/shared/ui";

import { loginSchema, type LoginFormValues } from "../model";

function getLoginErrorMessage(
  status?: number,
  error?: unknown,
): string {
  const failureKind = getRequestFailureKind({ error, status });

  switch (failureKind) {
    case REQUEST_FAILURE_KIND.AUTH:
      return "Incorrect email or password.";
    case REQUEST_FAILURE_KIND.NETWORK:
      return "Unable to reach the server. Check your connection and try again.";
    case REQUEST_FAILURE_KIND.SERVER:
      return "The server could not complete sign-in. Try again.";
    case REQUEST_FAILURE_KIND.CONFLICT:
    case REQUEST_FAILURE_KIND.UNKNOWN:
      return "Unable to sign in right now. Try again.";
  }

  const exhaustiveCheck: never = failureKind;
  return exhaustiveCheck;
}

export function LoginForm() {
  const location: Location<AuthRedirectState | null | undefined> = useLocation();
  const redirectState = location.state;
  const navigate = useNavigate();
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
              setSubmissionError(
                getLoginErrorMessage(result.response.status),
              );
              return;
            }

            const redirectPath = getAuthRedirectPath(redirectState);

            applyAuthenticatedSession(result.data);
            await navigate(redirectPath, { replace: true });
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordField
                  {...field}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  placeholder="Enter your password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submissionError ? (
          <InlineAlert>{submissionError}</InlineAlert>
        ) : null}

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Form>
  );
}
