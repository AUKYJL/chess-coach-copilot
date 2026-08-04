import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { SetStudentArchiveDto } from './dto/set-student-archive.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(coachAccountId: string) {
    return this.prisma.student.findMany({
      where: { coachAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(coachAccountId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        coachAccountId,
        displayName: dto.displayName.trim(),
        birthYear: dto.birthYear,
        rating: dto.rating,
        notes: dto.notes?.trim(),
      },
    });
  }

  async getOne(studentId: string, coachAccountId: string) {
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

  async update(
    studentId: string,
    coachAccountId: string,
    dto: UpdateStudentDto,
  ) {
    await this.getOne(studentId, coachAccountId);

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        displayName: dto.displayName?.trim(),
        birthYear: dto.birthYear,
        rating: dto.rating,
        notes: dto.notes?.trim(),
      },
    });
  }

  async setArchiveState(
    studentId: string,
    coachAccountId: string,
    dto: SetStudentArchiveDto,
  ) {
    await this.getOne(studentId, coachAccountId);

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        archivedAt: dto.archived ? new Date() : null,
      },
    });
  }
}
