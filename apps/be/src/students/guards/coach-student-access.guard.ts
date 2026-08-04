import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';

@Injectable()
export class CoachStudentAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string | undefined>;
      user: AuthenticatedCoach;
    }>();
    const studentId = request.params.studentId;

    if (!studentId) {
      throw new BadRequestException('Student id is required');
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        coachAccountId: request.user.coachAccountId,
      },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return true;
  }
}
