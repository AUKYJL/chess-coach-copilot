import { Link, Navigate } from "@tanstack/react-router";

import {
  SESSION_STATUS,
  useSessionStore,
} from "@/entities/session";
import { AuthShell } from "@/features/auth-shell";
import {
  getAuthRedirectPath,
} from "@/shared/lib/auth-redirect";

import { RegisterForm } from "./ui/register-form";

type RegisterPageProps = {
  redirectPath?: string;
};

export function RegisterPage({ redirectPath }: RegisterPageProps) {
  const status = useSessionStore((state) => state.status);

  if (status === SESSION_STATUS.AUTHENTICATED) {
    return <Navigate replace to={getAuthRedirectPath(redirectPath)} />;
  }

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-medium text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            to="/login"
            search={
              redirectPath
                ? {
                    redirect: redirectPath,
                  }
                : {}
            }
          >
            Sign in
          </Link>
        </>
      }
      subtitle="Set up your coaching workspace."
      title="Create your account"
    >
      <RegisterForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
