import { registerAs } from '@nestjs/config';
import { getRequiredEnv } from './env.validation.js';

export default registerAs('database', () => ({
  url: getRequiredEnv('DATABASE_URL'),
}));
