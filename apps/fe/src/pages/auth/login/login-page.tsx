import { Link, Navigate } from "@tanstack/react-router";

import {
  SESSION_STATUS,
  useSessionStore,
} from "@/entities/session";
import { AuthShell } from "@/features/auth-shell";
import {
  getAuthRedirectPath,
} from "@/shared/lib/auth-redirect";

import { LoginForm } from "./ui/login-form";

type LoginPageProps = {
  redirectPath?: string;
};

export function LoginPage({ redirectPath }: LoginPageProps) {
  const status = useSessionStore((state) => state.status);

  if (status === SESSION_STATUS.AUTHENTICATED) {
    return <Navigate replace to={getAuthRedirectPath(redirectPath)} />;
  }

  return (
    <AuthShell
      footer={
        <>
          New to Chess Coach Copilot?{" "}
          <Link
            className="font-medium text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            to="/register"
            search={
              redirectPath
                ? {
                    redirect: redirectPath,
                  }
                : {}
            }
          >
            Create account
          </Link>
        </>
      }
      subtitle="Sign in to continue to your coaching workspace."
      title="Welcome back"
    >
      <LoginForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
