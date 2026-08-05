import { jest } from '@jest/globals';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  it('returns a string validation message as-is', () => {
    const filter = new HttpExceptionFilter();
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
    const filter = new HttpExceptionFilter();
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
});

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createArgumentsHost(response: ReturnType<typeof createResponse>) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({
        url: '/test',
      }),
    }),
  } as ArgumentsHost;
}
