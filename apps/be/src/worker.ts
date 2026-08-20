import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { StockfishUciAdapter } from './analysis/engine/stockfish-uci.adapter.js';
import { WorkerModule } from './worker.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.get(StockfishUciAdapter).verifyAvailable();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
