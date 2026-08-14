import { createRouter } from "@tanstack/react-router";

import { useSessionStore } from "@/entities/session/model/session-store";
import { routeTree } from "@/routeTree.gen";

export const appRouter = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

useSessionStore.subscribe((state, previousState) => {
  if (state.status === previousState.status) {
    return;
  }

  appRouter.invalidate().catch((error) => {
    const normalizedError =
      error instanceof Error ? error : new Error("Router invalidation failed.");

    console.error("Router invalidation failed.", normalizedError);
  });
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof appRouter;
  }
}
