import { fetchClient } from "@/shared/api";
import type { components } from "@/shared/api/apiTypes";

import { SESSION_STATUS } from "../model/session-status";

export type CoachProfileResponse = components["schemas"]["CoachProfileResponse"];

export type CurrentSessionResult =
  | {
      status: typeof SESSION_STATUS.AUTHENTICATED;
      coach: CoachProfileResponse;
    }
  | {
      status: typeof SESSION_STATUS.UNAUTHENTICATED;
    };

export async function getCurrentSession(): Promise<CurrentSessionResult> {
  const { data, response } = await fetchClient.GET("/api/auth/me");

  if (response.ok && data) {
    return {
      status: SESSION_STATUS.AUTHENTICATED,
      coach: data,
    };
  }

  if (response.status === 401) {
    return {
      status: SESSION_STATUS.UNAUTHENTICATED,
    };
  }

  throw new Error(
    `Session check failed with status ${response.status || "unknown"}.`,
  );
}
