import { Activity, ChessPawn } from "lucide-react";
import type { RouteObject } from "react-router-dom";
import {
  NavLink,
  Navigate,
  Outlet,
  createBrowserRouter,
  createMemoryRouter,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { StudentOverviewPage } from "@/pages/student-overview";

import { cn } from "@/shared/lib/cn";

import {
  type StudentOverviewEnvironment,
  resolveStudentOverviewScenarioId,
} from "./student-overview-scenario";

const workspaceLinks = [
  { to: "/students/demo-student", label: "Students", icon: ChessPawn },
  { to: "/activity", label: "Activity", icon: Activity },
] as const;

function WorkspaceLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  return (
    <nav className={cn("space-y-2", className)} aria-label="Primary">
      {workspaceLinks.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-nav-active text-nav-active-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
                linkClassName,
              )
            }
          >
            <Icon aria-hidden="true" className="size-[1.05rem] shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function AppShell() {
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
              <p className="text-foreground text-sm font-semibold">Vladimir</p>
              <p className="text-muted-foreground text-xs">Coach account</p>
            </div>
          </div>

          <WorkspaceLinks
            className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
            linkClassName="min-w-fit shrink-0 rounded-full px-4 py-2.5"
          />
        </div>
      </header>

      <aside className="border-divider bg-surface-sidebar hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-10 xl:block xl:h-screen xl:h-dvh xl:w-60 xl:border-r xl:px-6 xl:py-8">
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

          <div className="border-divider bg-surface rounded-[28px] border px-4 py-4">
            <p className="text-foreground text-sm font-semibold">Vladimir</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Coach account
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 xl:min-h-dvh xl:pl-60">
        <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-8 xl:py-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function ActivityPage() {
  return (
    <div className="border-border bg-surface rounded-[32px] border px-6 py-10 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
        Activity
      </p>
      <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
        Activity route placeholder
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
        The shell is now routed. Student Overview remains the active
        implementation target, while the secondary workspace route stays
        intentionally minimal.
      </p>
    </div>
  );
}

function StudentOverviewRoute({
  environment,
}: {
  environment: StudentOverviewEnvironment;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenarioId = resolveStudentOverviewScenarioId(
    searchParams,
    environment,
  );

  return (
    <StudentOverviewPage
      scenarioId={scenarioId}
      showScenarioSwitcher={environment.DEV}
      onScenarioChange={(nextScenarioId) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set("scenario", nextScenarioId);
        void navigate({
          search: `?${nextSearchParams.toString()}`,
        });
      }}
    />
  );
}

export function createAppRoutes(
  environment: StudentOverviewEnvironment = { DEV: import.meta.env.DEV },
): RouteObject[] {
  return [
    {
      path: "/",
      element: <AppShell />,
      children: [
        {
          index: true,
          element: <Navigate replace to="/students/demo-student" />,
        },
        {
          path: "activity",
          element: <ActivityPage />,
        },
        {
          path: "students/:studentId",
          element: <StudentOverviewRoute environment={environment} />,
        },
      ],
    },
  ];
}

export const appRoutes: RouteObject[] = createAppRoutes();

export const appRouter = createBrowserRouter(appRoutes);

export function createTestRouter(
  initialEntries: string[] = ["/students/demo-student"],
  environment: StudentOverviewEnvironment = { DEV: true },
) {
  return createMemoryRouter(createAppRoutes(environment), {
    initialEntries,
  });
}
