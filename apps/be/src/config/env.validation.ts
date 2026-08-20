type EnvSource = Record<string, unknown>;

function getRequiredString(source: EnvSource, key: string): string {
  const value = source[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function validateOptionalPositiveInteger(source: EnvSource, key: string): void {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    throw new Error(`Environment variable ${key} must be a string`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }
}

function validateOptionalBoolean(source: EnvSource, key: string): void {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    throw new Error(`Environment variable ${key} must be a string`);
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized !== 'true' &&
    normalized !== 'false' &&
    normalized !== '1' &&
    normalized !== '0' &&
    normalized !== 'yes' &&
    normalized !== 'no' &&
    normalized !== 'on' &&
    normalized !== 'off'
  ) {
    throw new Error(`Environment variable ${key} must be a boolean`);
  }
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  getRequiredString(config, 'DATABASE_URL');
  getRequiredString(config, 'JWT_ACCESS_SECRET');
  getRequiredString(config, 'JWT_REFRESH_SECRET');
  getRequiredString(config, 'OPENROUTER_API_KEY');
  validateOptionalPositiveInteger(config, 'PORT');
  validateOptionalPositiveInteger(config, 'JWT_ACCESS_TTL_SECONDS');
  validateOptionalPositiveInteger(config, 'JWT_REFRESH_TTL_SECONDS');
  validateOptionalBoolean(config, 'LOGGER_PRETTY');
  return config;
}

export function getRequiredEnv(name: string): string {
  return getRequiredString(process.env, name);
}

export function getOptionalEnv(name: string): string | null {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  return value;
}
