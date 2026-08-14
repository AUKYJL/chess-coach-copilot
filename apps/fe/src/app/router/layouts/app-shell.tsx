import { Outlet, useLocation } from "react-router-dom";

import { cn } from "@/shared/lib/cn";
import {
  Container,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

import { WorkspaceLinks } from "./workspace-links";
import { SESSION_STATUS, useSessionStore } from "@/entities/session";
import { LogoutButton } from "@/features/logout-button";

function getCoachInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell() {
  const location = useLocation();
  const coach = useSessionStore((state) => state.coach);
  const status = useSessionStore((state) => state.status);
  const displayName = coach?.displayName ?? "Coach";
  const coachSecondaryLabel = coach?.email ?? "Coach account";
  const coachInitials = getCoachInitials(displayName);
  const showLogoutButton = status === SESSION_STATUS.AUTHENTICATED;
  const isStudentsRoute =
    location.pathname === "/students" || location.pathname.startsWith("/students/");

  return (
    <div className="bg-background min-h-dvh">
      <header className="border-divider bg-surface-sidebar/96 sticky top-0 z-20 border-b backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.24em] uppercase">
                Chess Coach Copilot
              </p>
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Workspace
              </h2>
            </div>

            <div className="border-divider bg-surface min-w-0 rounded-[22px] border px-3 py-2 text-right">
              <p className="text-foreground text-sm font-semibold">
                {displayName}
              </p>
              <Typography
                as="p"
                color={TYPOGRAPHY_COLOR.SECONDARY}
                variant={TYPOGRAPHY_VARIANT.CAPTION}
              >
                Coach account
              </Typography>
              {showLogoutButton ? (
                <div className="mt-2">
                  <LogoutButton />
                </div>
              ) : null}
            </div>
          </div>

          <WorkspaceLinks
            className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
            linkClassName="min-w-fit shrink-0 rounded-full px-4 py-2.5"
          />
        </div>
      </header>

      <aside className="border-divider bg-surface-sidebar hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-10 xl:block xl:h-dvh xl:h-screen xl:w-60 xl:border-r xl:px-6 xl:py-8">
        <div className="flex h-full flex-col justify-between gap-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
                Chess Coach Copilot
              </p>
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                Workspace
              </h2>
            </div>

            <WorkspaceLinks />
          </div>

          <div className="border-divider flex items-center justify-between gap-3 border-t pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="bg-avatar text-avatar-foreground flex size-11 items-center justify-center rounded-full text-sm font-semibold">
                  {coachInitials}
                </div>
                <span className="bg-success ring-surface-sidebar absolute right-0 bottom-0 size-3 rounded-full ring-2" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">
                  {displayName}
                </p>
                <Typography
                  as="p"
                  className="truncate"
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  {coachSecondaryLabel}
                </Typography>
              </div>
            </div>
            {showLogoutButton ? (
              <LogoutButton
                buttonClassName={cn(
                  "h-auto shrink-0 rounded-full px-0 py-0 text-xs font-semibold",
                  "hover:bg-transparent hover:text-foreground",
                )}
                className="shrink-0"
                fullWidth={false}
              />
            ) : null}
          </div>
        </div>
      </aside>

      <main className="min-w-0 xl:min-h-dvh xl:pl-60">
        <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-8 xl:py-8">
          <Container size={isStudentsRoute ? "workspace" : "default"}>
            <Outlet />
          </Container>
        </div>
      </main>
    </div>
  );
}
