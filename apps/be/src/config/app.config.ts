import { registerAs } from '@nestjs/config';

const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

export const APP_ENVIRONMENT = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type AppEnvironment =
  (typeof APP_ENVIRONMENT)[keyof typeof APP_ENVIRONMENT];

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  switch (value) {
    case undefined:
    case APP_ENVIRONMENT.DEVELOPMENT:
      return APP_ENVIRONMENT.DEVELOPMENT;
    case APP_ENVIRONMENT.TEST:
      return APP_ENVIRONMENT.TEST;
    case APP_ENVIRONMENT.PRODUCTION:
      return APP_ENVIRONMENT.PRODUCTION;
    default:
      throw new Error(`Unsupported NODE_ENV value: ${value}`);
  }
}

export default registerAs('app', () => ({
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  nodeEnv: parseAppEnvironment(process.env.NODE_ENV),
  corsOrigins: parseCorsOrigins(process.env.APP_CORS_ORIGINS),
}));
