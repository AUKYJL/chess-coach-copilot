import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : Array.isArray((errorResponse as { message?: unknown }).message)
          ? (errorResponse as { message: string[] }).message
          : ((errorResponse as { message?: string }).message ??
            'Unexpected error');

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
