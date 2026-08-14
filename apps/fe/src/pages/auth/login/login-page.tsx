import { Link, Navigate } from "@tanstack/react-router";

import { getAuthRedirectPath } from "@/shared/lib/auth-redirect";

import { LoginForm } from "./ui/login-form";
import { SESSION_STATUS, useSessionStore } from "@/entities/session";
import { AuthShell } from "@/features/auth-shell";

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
          Впервые в Chess Coach Copilot?{" "}
          <Link
            className="text-accent hover:text-accent-hover focus-visible:ring-accent/40 focus-visible:ring-offset-background font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/register"
            search={
              redirectPath
                ? {
                    redirect: redirectPath,
                  }
                : {}
            }
          >
            Создать аккаунт
          </Link>
        </>
      }
      subtitle="Войдите, чтобы продолжить работу."
      title="С возвращением"
    >
      <LoginForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
