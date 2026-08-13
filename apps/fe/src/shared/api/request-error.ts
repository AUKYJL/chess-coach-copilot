export const REQUEST_FAILURE_KIND = {
  AUTH: "auth",
  CONFLICT: "conflict",
  NETWORK: "network",
  SERVER: "server",
  UNKNOWN: "unknown",
} as const;

export type RequestFailureKind =
  (typeof REQUEST_FAILURE_KIND)[keyof typeof REQUEST_FAILURE_KIND];

type RequestFailureInput = {
  error?: unknown;
  status?: number;
};

export function getRequestFailureKind({
  error,
  status,
}: RequestFailureInput): RequestFailureKind {
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return REQUEST_FAILURE_KIND.AUTH;
    }

    if (status === 409) {
      return REQUEST_FAILURE_KIND.CONFLICT;
    }

    if (status >= 500) {
      return REQUEST_FAILURE_KIND.SERVER;
    }

    return REQUEST_FAILURE_KIND.UNKNOWN;
  }

  if (error instanceof TypeError) {
    return REQUEST_FAILURE_KIND.NETWORK;
  }

  if (error instanceof Error) {
    return REQUEST_FAILURE_KIND.SERVER;
  }

  return REQUEST_FAILURE_KIND.UNKNOWN;
}
