import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateMistakeReviewDto } from '../dto/update-mistake-review.dto.js';

@Injectable()
export class AnalysisReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateOwnedMistakeReview(
    mistakeId: string,
    coachAccountId: string,
    dto: UpdateMistakeReviewDto,
  ) {
    const ownedMistake = await this.prisma.mistake.findFirst({
      where: {
        id: mistakeId,
      },
      include: {
        analysis: {
          select: {
            coachAccountId: true,
          },
        },
      },
    });

    if (
      !ownedMistake ||
      ownedMistake.analysis.coachAccountId !== coachAccountId
    ) {
      throw new NotFoundException('Mistake not found');
    }

    const normalizedCoachNote =
      dto.coachNote === undefined ? undefined : dto.coachNote?.trim() || null;

    return this.prisma.mistake.update({
      where: {
        id: mistakeId,
      },
      data: {
        reviewStatus: dto.status,
        ...(normalizedCoachNote !== undefined
          ? { coachNote: normalizedCoachNote }
          : {}),
      },
    });
  }
}
