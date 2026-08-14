import type { RouteObject } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ActivityPage } from "@/pages/activity";
import { StudentsPage } from "@/pages/students";
import { StudentOverviewPage } from "@/pages/student-overview";

import { AppShell, ProtectedLayout } from "./layouts";
import { RootRedirect } from "./redirects";

export function createAppRoutes(): RouteObject[] {
  return [
    {
      path: "/",
      element: <RootRedirect />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      element: <ProtectedLayout />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              path: "activity",
              element: <ActivityPage />,
            },
            {
              path: "students",
              element: <StudentsPage />,
            },
            {
              path: "students/:studentId",
              element: <StudentOverviewPage />,
            },
          ],
        },
      ],
    },
  ];
}

export const appRoutes: RouteObject[] = createAppRoutes();

export const appRouter = createBrowserRouter(appRoutes);
