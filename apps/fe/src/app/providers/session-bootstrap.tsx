import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

import {
  bootstrapSession,
  terminateSession,
} from "@/entities/session";
import { setSessionInvalidatedHandler } from "@/shared/api";

type SessionBootstrapProps = {
  queryClient: QueryClient;
};

export function SessionBootstrap({ queryClient }: SessionBootstrapProps) {
  useEffect(() => {
    setSessionInvalidatedHandler(() => {
      terminateSession();
      queryClient.clear();
    });

    bootstrapSession().catch((error) => {
      const normalizedError =
        error instanceof Error ? error : new Error("Session bootstrap failed.");

      console.error("Session bootstrap failed.", normalizedError);
    });

    return () => {
      setSessionInvalidatedHandler(null);
    };
  }, [queryClient]);

  return null;
}
