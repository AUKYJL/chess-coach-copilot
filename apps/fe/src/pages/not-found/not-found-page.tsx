import { Link } from "@tanstack/react-router";

import { AUTHENTICATED_LANDING_PATH } from "@/shared/lib/auth-redirect";
import { Button } from "@/shared/ui";
import { BUTTON_SIZE } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <div className="border-border bg-surface space-y-4 rounded-[32px] border px-6 py-10 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
        Не найдено
      </p>
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Такой страницы нет
      </h1>
      <p className="text-muted-foreground max-w-2xl text-sm leading-6">
        Ссылка могла устареть, либо страница была перемещена в другой раздел
        рабочего пространства.
      </p>
      <Button asChild size={BUTTON_SIZE.SM}>
        <Link to={AUTHENTICATED_LANDING_PATH}>Перейти к ученикам</Link>
      </Button>
    </div>
  );
}
