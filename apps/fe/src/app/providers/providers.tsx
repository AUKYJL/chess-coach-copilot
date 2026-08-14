import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { appQueryClient } from "@/app/providers/query-client";
import { appRouter } from "@/app/tanstack-router";

import { SessionBootstrap } from "./session-bootstrap";

type AppProvidersProps = {
  queryClient?: QueryClient;
};

export function AppProviders({
  queryClient = appQueryClient,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap queryClient={queryClient} />
      <RouterProvider router={appRouter} />
    </QueryClientProvider>
  );
}
