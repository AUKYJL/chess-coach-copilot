/* oxlint-disable react/only-export-components */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { RegisterPage } from "@/pages/auth/register";

import {
  AUTHENTICATED_LANDING_PATH,
  getAuthRedirectPath,
} from "@/shared/lib/auth-redirect";

import { SESSION_STATUS, useSessionStore } from "@/entities/session";

const registerSearchSchema = z.object({
  redirect: z.string().catch("").optional(),
});

export const Route = createFileRoute("/(auth)/register")({
  validateSearch: registerSearchSchema,
  beforeLoad: ({ search }) => {
    if (useSessionStore.getState().status === SESSION_STATUS.AUTHENTICATED) {
      throw redirect({
        to: getAuthRedirectPath(search.redirect, AUTHENTICATED_LANDING_PATH),
        replace: true,
      });
    }
  },
  component: RegisterRoute,
});

function RegisterRoute() {
  const search = Route.useSearch();

  return <RegisterPage redirectPath={search.redirect} />;
}
