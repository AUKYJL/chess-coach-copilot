import { RouterProvider } from "react-router-dom";

import { appRouter } from "@/app/router";

export function AppProviders() {
  return <RouterProvider router={appRouter} />;
}
