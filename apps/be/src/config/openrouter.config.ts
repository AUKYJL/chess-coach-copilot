import { registerAs } from '@nestjs/config';
import { getRequiredEnv } from './env.validation.js';

const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export default registerAs('openrouter', () => ({
  apiKey: getRequiredEnv('OPENROUTER_API_KEY'),
  model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
  baseUrl: OPENROUTER_BASE_URL,
}));
