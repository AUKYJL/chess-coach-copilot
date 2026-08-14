/* oxlint-disable react/only-export-components */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { LoginPage } from "@/pages/auth/login";

import {
  AUTHENTICATED_LANDING_PATH,
  getAuthRedirectPath,
} from "@/shared/lib/auth-redirect";

import { SESSION_STATUS, useSessionStore } from "@/entities/session";

const loginSearchSchema = z.object({
  redirect: z.string().catch("").optional(),
});

export const Route = createFileRoute("/(auth)/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ search }) => {
    if (useSessionStore.getState().status === SESSION_STATUS.AUTHENTICATED) {
      throw redirect({
        to: getAuthRedirectPath(search.redirect, AUTHENTICATED_LANDING_PATH),
        replace: true,
      });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const search = Route.useSearch();

  return <LoginPage redirectPath={search.redirect} />;
}
