import { registerAs } from '@nestjs/config';
import { getRequiredEnv } from './env.validation.js';

const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_REFRESH_COOKIE_NAME = 'refresh_token';

export default registerAs('jwt', () => ({
  accessSecret: getRequiredEnv('JWT_ACCESS_SECRET'),
  refreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  accessTtlSeconds: Number(
    process.env.JWT_ACCESS_TTL_SECONDS ?? DEFAULT_ACCESS_TTL_SECONDS,
  ),
  refreshTtlSeconds: Number(
    process.env.JWT_REFRESH_TTL_SECONDS ?? DEFAULT_REFRESH_TTL_SECONDS,
  ),
  refreshCookieName:
    process.env.AUTH_REFRESH_COOKIE_NAME?.trim() || DEFAULT_REFRESH_COOKIE_NAME,
}));
