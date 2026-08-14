import { useNavigate, useRouter } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
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

import { type RegisterFormValues, registerSchema } from "../model";

import { applyAuthenticatedSession } from "@/entities/session";

function getRegisterErrorMessage(status?: number, error?: unknown): string {
  const failureKind = getRequestFailureKind({ error, status });

  switch (failureKind) {
    case REQUEST_FAILURE_KIND.CONFLICT:
      return "An account with this email already exists.";
    case REQUEST_FAILURE_KIND.NETWORK:
      return "Unable to reach the server. Check your connection and try again.";
    case REQUEST_FAILURE_KIND.SERVER:
      return "The server could not create your account. Try again.";
    case REQUEST_FAILURE_KIND.AUTH:
      return "Your registration request could not be authorized.";
    case REQUEST_FAILURE_KIND.UNKNOWN:
      return "Unable to create account right now. Try again.";
  }

  const exhaustiveCheck: never = failureKind;
  return exhaustiveCheck;
}

type RegisterFormProps = {
  redirectPath?: string;
};

export function RegisterForm({ redirectPath }: RegisterFormProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
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
            const result = await fetchClient.POST("/api/auth/register", {
              body: values,
            });

            if (!result.response.ok || !result.data) {
              setSubmissionError(
                getRegisterErrorMessage(result.response.status),
              );
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
            setSubmissionError(getRegisterErrorMessage(undefined, error));
          } finally {
            setIsSubmitting(false);
          }
        })}
      >
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="name"
                  disabled={isSubmitting}
                  placeholder="Coach Alex"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  placeholder="Create a password"
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </Form>
  );
}
