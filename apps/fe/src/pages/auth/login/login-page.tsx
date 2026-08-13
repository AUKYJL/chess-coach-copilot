import type { Location } from "react-router-dom";
import { Link, Navigate, useLocation } from "react-router-dom";

import {
  SESSION_STATUS,
  useSessionStore,
} from "@/entities/session";
import { AuthShell } from "@/features/auth-shell";
import {
  getAuthRedirectPath,
  type AuthRedirectState,
} from "@/shared/lib/auth-redirect";

import { LoginForm } from "./ui/login-form";

export function LoginPage() {
  const location: Location<AuthRedirectState | null | undefined> = useLocation();
  const redirectState = location.state;
  const status = useSessionStore((state) => state.status);

  if (status === SESSION_STATUS.AUTHENTICATED) {
    return <Navigate replace to={getAuthRedirectPath(redirectState)} />;
  }

  return (
    <AuthShell
      footer={
        <>
          New to Chess Coach Copilot?{" "}
          <Link
            className="font-medium text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            state={redirectState}
            to="/register"
          >
            Create account
          </Link>
        </>
      }
      subtitle="Sign in to continue to your coaching workspace."
      title="Welcome back"
    >
      <LoginForm />
    </AuthShell>
  );
}
