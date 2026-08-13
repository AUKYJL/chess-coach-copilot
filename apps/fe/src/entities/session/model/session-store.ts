import { create } from "zustand";

import type { CoachProfileResponse } from "../api";
import { SESSION_STATUS, type SessionStatus } from "./session-status";

export type SessionStore = {
  status: SessionStatus;
  coach: CoachProfileResponse | null;
  bootstrapError: Error | null;
  setChecking: () => void;
  setBootstrapError: (error: Error) => void;
  setAuthenticated: (coach: CoachProfileResponse) => void;
  setUnauthenticated: () => void;
};

let sessionStateVersion = 0;

function bumpSessionStateVersion(): void {
  sessionStateVersion += 1;
}

export function getSessionStateVersion(): number {
  return sessionStateVersion;
}

export const useSessionStore = create<SessionStore>((set) => ({
  status: SESSION_STATUS.CHECKING,
  coach: null,
  bootstrapError: null,
  setChecking() {
    set((state) => ({
      ...state,
      status: SESSION_STATUS.CHECKING,
      bootstrapError: null,
    }));
  },
  setBootstrapError(error) {
    set((state) => ({
      ...state,
      status: SESSION_STATUS.CHECKING,
      bootstrapError: error,
    }));
  },
  setAuthenticated(coach) {
    bumpSessionStateVersion();
    set({
      status: SESSION_STATUS.AUTHENTICATED,
      coach,
      bootstrapError: null,
    });
  },
  setUnauthenticated() {
    bumpSessionStateVersion();
    set({
      status: SESSION_STATUS.UNAUTHENTICATED,
      coach: null,
      bootstrapError: null,
    });
  },
}));
