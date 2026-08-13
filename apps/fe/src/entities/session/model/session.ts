import { clearAccessToken, setAccessToken } from "@/shared/api";

import { getCurrentSession, type CoachProfileResponse } from "../api";
import { SESSION_STATUS } from "./session-status";
import { getSessionStateVersion, useSessionStore } from "./session-store";

let bootstrapPromise: Promise<void> | null = null;

type AuthenticatedSessionPayload = {
  accessToken: string;
  coach: CoachProfileResponse;
};

function getSessionStore() {
  return useSessionStore.getState();
}

async function runBootstrapSession(
  startedSessionStateVersion: number,
): Promise<void> {
  getSessionStore().setChecking();

  try {
    const result = await getCurrentSession();

    if (getSessionStateVersion() !== startedSessionStateVersion) {
      return;
    }

    if (result.status === SESSION_STATUS.AUTHENTICATED) {
      getSessionStore().setAuthenticated(result.coach);
      return;
    }

    getSessionStore().setUnauthenticated();
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Session check failed.");

    if (getSessionStateVersion() !== startedSessionStateVersion) {
      return;
    }

    getSessionStore().setBootstrapError(normalizedError);

    throw normalizedError;
  }
}

export function applyAuthenticatedSession({
  accessToken,
  coach,
}: AuthenticatedSessionPayload): void {
  setAccessToken(accessToken);
  getSessionStore().setAuthenticated(coach);
}

export function setUnauthenticatedSession(): void {
  getSessionStore().setUnauthenticated();
}

export function terminateSession(): void {
  clearAccessToken();
  getSessionStore().setUnauthenticated();
}

export function bootstrapSession(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrapSession(getSessionStateVersion()).finally(
      () => {
        bootstrapPromise = null;
      },
    );
  }

  return bootstrapPromise;
}
