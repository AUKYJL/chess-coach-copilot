import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";

import type { DeepOptionalKey } from "@/shared/types";

import { getAccessToken, setAccessToken } from "./access-token";
import type { paths } from "./apiTypes";
import { API_BASE_URL } from "./config";
import { REFRESH_STATUS } from "./refresh-status";

const AUTHORIZATION_HEADER = "Authorization";

const nonRefreshingPaths = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/register",
]);

const refreshClient = createFetchClient<DeepOptionalKey<paths, "header">>({
  baseUrl: API_BASE_URL,
  credentials: "include",
});

type SessionInvalidatedHandler = () => void;
type RefreshResult =
  | {
      status: typeof REFRESH_STATUS.REFRESHED;
      accessToken: string;
    }
  | {
      status: typeof REFRESH_STATUS.RETRYABLE_ERROR;
    }
  | {
      status: typeof REFRESH_STATUS.UNAUTHENTICATED;
    };

let refreshPromise: Promise<RefreshResult> | null = null;
let sessionInvalidatedHandler: SessionInvalidatedHandler | null = null;

class RetryableRefreshError extends Error {
  constructor() {
    super("Access token refresh failed with a retryable error.");
  }
}

function getRequestPath(request: Request): string {
  return new URL(request.url).pathname;
}

function withAccessToken(
  request: Request,
  accessToken: string | null,
): Request {
  if (!accessToken) {
    return request;
  }

  const headers = new Headers(request.headers);

  headers.set(AUTHORIZATION_HEADER, `Bearer ${accessToken}`);

  return new Request(request, {
    headers,
  });
}

function getRefreshFailureResult(response: Response): RefreshResult {
  if (response.status >= 500) {
    return {
      status: REFRESH_STATUS.RETRYABLE_ERROR,
    };
  }

  sessionInvalidatedHandler?.();

  return {
    status: REFRESH_STATUS.UNAUTHENTICATED,
  };
}

async function performRefresh(): Promise<RefreshResult> {
  const { data, response } = await refreshClient.POST("/api/auth/refresh");

  if (!response.ok || !data?.accessToken) {
    return getRefreshFailureResult(response);
  }

  setAccessToken(data.accessToken);

  return {
    status: REFRESH_STATUS.REFRESHED,
    accessToken: data.accessToken,
  };
}

export function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function setSessionInvalidatedHandler(
  handler: SessionInvalidatedHandler | null,
): void {
  sessionInvalidatedHandler = handler;
}

async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const retryRequest = request.clone();
  const response = await fetch(withAccessToken(request, getAccessToken()));

  if (
    response.status !== 401 ||
    nonRefreshingPaths.has(getRequestPath(request))
  ) {
    return response;
  }

  const refreshResult = await refreshAccessToken();

  if (refreshResult.status !== REFRESH_STATUS.REFRESHED) {
    if (refreshResult.status === REFRESH_STATUS.RETRYABLE_ERROR) {
      throw new RetryableRefreshError();
    }

    return response;
  }

  const retriedResponse = await fetch(
    withAccessToken(retryRequest, refreshResult.accessToken),
  );

  if (retriedResponse.status === 401) {
    sessionInvalidatedHandler?.();
  }

  return retriedResponse;
}

export const fetchClient = createFetchClient<DeepOptionalKey<paths, "header">>({
  baseUrl: API_BASE_URL,
  credentials: "include",
  fetch: authenticatedFetch,
});

export const $api = createClient(fetchClient);
