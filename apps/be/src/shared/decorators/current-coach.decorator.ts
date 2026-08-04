import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedCoach } from '../types/authenticated-coach.type.js';

export const CurrentCoach = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedCoach => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedCoach }>();

    return request.user;
  },
);
