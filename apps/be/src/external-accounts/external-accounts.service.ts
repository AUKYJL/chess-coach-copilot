import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExternalAccountDto } from './dto/create-external-account.dto.js';

@Injectable()
export class ExternalAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(studentId: string, coachAccountId: string) {
    await this.assertStudentExists(studentId, coachAccountId);

    return this.prisma.externalAccount.findMany({
      where: { studentId },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });
  }

  async create(
    studentId: string,
    coachAccountId: string,
    dto: CreateExternalAccountDto,
  ) {
    const student = await this.assertStudentExists(studentId, coachAccountId);

    if (student.archivedAt) {
      throw new UnprocessableEntityException(
        'Archived students cannot receive new external accounts',
      );
    }

    const existingAccount = await this.prisma.externalAccount.findFirst({
      where: {
        studentId,
        platform: dto.platform,
        username: dto.username.trim(),
      },
    });

    if (existingAccount) {
      throw new ConflictException('External account already exists');
    }

    return this.prisma.externalAccount.create({
      data: {
        studentId,
        platform: dto.platform,
        username: dto.username.trim(),
      },
    });
  }

  private async assertStudentExists(studentId: string, coachAccountId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        coachAccountId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }
}
