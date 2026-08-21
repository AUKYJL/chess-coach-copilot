import { jest } from '@jest/globals';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import type { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  it('returns a string validation message as-is', () => {
    const filter = new HttpExceptionFilter(createLogger());
    const response = createResponse();

    filter.catch(
      new BadRequestException('Invalid payload'),
      createArgumentsHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid payload',
      }),
    );
  });

  it('returns a string array validation message as-is', () => {
    const filter = new HttpExceptionFilter(createLogger());
    const response = createResponse();

    filter.catch(
      new BadRequestException({
        message: ['email must be an email', 'password is too short'],
      }),
      createArgumentsHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ['email must be an email', 'password is too short'],
      }),
    );
  });

  it('logs unexpected failures with request context and the original error', () => {
    const logger = createLogger();
    const filter = new HttpExceptionFilter(logger);
    const response = createResponse();
    const error = new Error('database offline');

    filter.catch(
      error,
      createArgumentsHost(response, { id: 'trace-id', url: '/test' }),
    );

    expect(logger.error.mock.calls).toContainEqual([
      expect.objectContaining({
        event: 'http_exception',
        traceId: 'trace-id',
        path: '/test',
        statusCode: 500,
        err: error,
      }),
      'HTTP request failed',
    ]);
  });
});

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createLogger(): Logger & { error: jest.Mock } {
  return {
    error: jest.fn(),
  } as unknown as Logger & { error: jest.Mock };
}

function createArgumentsHost(
  response: ReturnType<typeof createResponse>,
  request: { id?: string; url: string } = { url: '/test' },
) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ ...request, headers: {} }),
    }),
  } as ArgumentsHost;
}
