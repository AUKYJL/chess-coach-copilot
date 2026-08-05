import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

function hasMessageField(value: object): value is { message?: unknown } {
  return 'message' in value;
}

function getErrorMessage(errorResponse: unknown): string | string[] {
  if (typeof errorResponse === 'string') {
    return errorResponse;
  }

  if (typeof errorResponse !== 'object' || errorResponse === null) {
    return 'Unexpected error';
  }

  if (!hasMessageField(errorResponse)) {
    return 'Unexpected error';
  }

  const { message } = errorResponse;

  if (typeof message === 'string') {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === 'string')
  ) {
    return message;
  }

  return 'Unexpected error';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = isHttpException
      ? exception.getResponse()
      : 'Internal server error';
    const message = getErrorMessage(errorResponse);

    if (!isHttpException || status >= 500) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      error: isHttpException ? exception.name : 'InternalServerError',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
