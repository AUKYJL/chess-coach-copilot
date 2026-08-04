import type { CookieOptions } from 'express';

const REFRESH_COOKIE_PATH = '/auth';

export function getRefreshCookieBaseOptions(input: {
  isProduction: boolean;
}): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: input.isProduction,
    path: REFRESH_COOKIE_PATH,
  };
}

export function getRefreshCookieOptions(input: {
  isProduction: boolean;
  maxAgeMs: number;
}): CookieOptions {
  return {
    ...getRefreshCookieBaseOptions({
      isProduction: input.isProduction,
    }),
    maxAge: input.maxAgeMs,
  };
}
