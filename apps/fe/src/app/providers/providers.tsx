import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { RouterProviderProps } from "react-router-dom";
import { RouterProvider } from "react-router-dom";

import { appQueryClient } from "@/app/providers/query-client";
import { appRouter } from "@/app/router";

import { SessionBootstrap } from "./session-bootstrap";

type AppProvidersProps = {
  queryClient?: QueryClient;
  router?: RouterProviderProps["router"];
};

export function AppProviders({
  queryClient = appQueryClient,
  router = appRouter,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap queryClient={queryClient} />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
