import { registerAs } from '@nestjs/config';
import { APP_ENVIRONMENT, type AppEnvironment } from './app.config.js';

type LoggerLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

const LOGGER_LEVELS: LoggerLevel[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
];

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'on':
      return true;
    case 'false':
    case '0':
    case 'no':
    case 'off':
      return false;
    default:
      throw new Error(`Unsupported LOGGER_PRETTY value: ${value}`);
  }
}

function parseNodeEnv(value: string | undefined): AppEnvironment {
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

function getDefaultLevel(nodeEnv: AppEnvironment): LoggerLevel {
  switch (nodeEnv) {
    case APP_ENVIRONMENT.TEST:
      return 'silent';
    case APP_ENVIRONMENT.PRODUCTION:
      return 'info';
    default:
      return 'debug';
  }
}

function parseLevel(
  value: string | undefined,
  fallback: LoggerLevel,
): LoggerLevel {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (LOGGER_LEVELS.includes(normalized as LoggerLevel)) {
    return normalized as LoggerLevel;
  }

  throw new Error(`Unsupported LOG_LEVEL value: ${value}`);
}

export default registerAs('logger', () => {
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
  const defaultLevel = getDefaultLevel(nodeEnv);

  return {
    level: parseLevel(process.env.LOG_LEVEL, defaultLevel),
    pretty: parseBoolean(
      process.env.LOGGER_PRETTY,
      nodeEnv === APP_ENVIRONMENT.DEVELOPMENT,
    ),
  };
});
