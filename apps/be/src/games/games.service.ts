import { Injectable } from '@nestjs/common';
import {
  AnnotationCoverage,
  GameSourceType,
  StudentColor,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createImportedGame(data: {
    coachAccountId: string;
    studentId: string;
    sourceLabel?: string;
    studentColor: StudentColor;
    rawPgn: string;
    normalizedPgnHash: string;
    hasEngineAnnotations: boolean;
    annotationCoverage: AnnotationCoverage;
    reducedConfidenceWarning: string | null;
  }) {
    const duplicate = await this.prisma.game.findFirst({
      where: {
        studentId: data.studentId,
        normalizedPgnHash: data.normalizedPgnHash,
      },
      select: { id: true },
    });

    const game = await this.prisma.game.create({
      data: {
        ...data,
        sourceType: GameSourceType.MANUAL_PGN,
      },
    });

    return {
      game,
      isDuplicate: Boolean(duplicate),
    };
  }
}
