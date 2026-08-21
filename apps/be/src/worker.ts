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
  const stockfish = app.get(StockfishUciAdapter);
  await stockfish.verifyAvailable();
  app.get(Logger).log(
    {
      event: 'worker_ready',
      engine: stockfish.getIdentity(),
    },
    'Background worker is ready',
  );
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
