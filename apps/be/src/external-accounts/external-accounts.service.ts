import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExternalAccountDto } from './dto/create-external-account.dto.js';
import { UpdateExternalAccountDto } from './dto/update-external-account.dto.js';

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

    try {
      return await this.prisma.externalAccount.create({
        data: {
          studentId,
          platform: dto.platform,
          username: dto.username.trim(),
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('External account already exists');
      }

      throw error;
    }
  }

  async update(
    studentId: string,
    externalAccountId: string,
    coachAccountId: string,
    dto: UpdateExternalAccountDto,
  ) {
    await this.assertStudentExists(studentId, coachAccountId);
    await this.assertOwnedExternalAccount(studentId, externalAccountId);

    const username = dto.username.trim();
    const existingAccount = await this.prisma.externalAccount.findFirst({
      where: {
        studentId,
        platform: dto.platform,
        username,
      },
    });

    if (existingAccount && existingAccount.id !== externalAccountId) {
      throw new ConflictException('External account already exists');
    }

    try {
      return await this.prisma.externalAccount.update({
        where: { id: externalAccountId },
        data: {
          platform: dto.platform,
          username,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('External account already exists');
      }

      throw error;
    }
  }

  async remove(
    studentId: string,
    externalAccountId: string,
    coachAccountId: string,
  ) {
    await this.assertStudentExists(studentId, coachAccountId);
    await this.assertOwnedExternalAccount(studentId, externalAccountId);

    await this.prisma.externalAccount.delete({
      where: { id: externalAccountId },
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

  private async assertOwnedExternalAccount(
    studentId: string,
    externalAccountId: string,
  ) {
    const externalAccount = await this.prisma.externalAccount.findFirst({
      where: {
        id: externalAccountId,
        studentId,
      },
    });

    if (!externalAccount) {
      throw new NotFoundException('External account not found');
    }

    return externalAccount;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
