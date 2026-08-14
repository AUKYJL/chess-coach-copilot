import { Link, Navigate } from "@tanstack/react-router";

import { getAuthRedirectPath } from "@/shared/lib/auth-redirect";

import { RegisterForm } from "./ui/register-form";
import { SESSION_STATUS, useSessionStore } from "@/entities/session";
import { AuthShell } from "@/features/auth-shell";

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
          Уже есть аккаунт?{" "}
          <Link
            className="text-accent hover:text-accent-hover focus-visible:ring-accent/40 focus-visible:ring-offset-background font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/login"
            search={
              redirectPath
                ? {
                    redirect: redirectPath,
                  }
                : {}
            }
          >
            Войти
          </Link>
        </>
      }
      subtitle="Создайте рабочее пространство для тренера."
      title="Создать аккаунт"
    >
      <RegisterForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
