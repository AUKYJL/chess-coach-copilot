import { randomUUID } from 'node:crypto';
import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from '../../config/index.js';
import {
  REQUEST_ID_HEADER,
  normalizeRequestId,
  readRequestIdHeader,
} from './request-id.util.js';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [loggerConfig.KEY],
      useFactory: (
        loggingConfiguration: ConfigType<typeof loggerConfig>,
      ): Params => ({
        pinoHttp: {
          level: loggingConfiguration.level,
          autoLogging: false,
          genReqId: (request, response) => {
            const requestId =
              readRequestIdHeader(request.headers) ?? randomUUID();

            request.id = requestId;
            response.setHeader(REQUEST_ID_HEADER, requestId);

            return requestId;
          },
          customProps: (request) => ({
            traceId: normalizeRequestId(request.id) ?? randomUUID(),
          }),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
          transport: loggingConfiguration.pretty
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggingModule {}
