/* oxlint-disable react/only-export-components */
/* oxlint-disable react/only-export-components */
import { Outlet, createRootRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/pages/not-found";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return <Outlet />;
}
