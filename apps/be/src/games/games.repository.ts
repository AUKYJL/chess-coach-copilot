import { Injectable } from '@nestjs/common';
import { GameSourceType, StudentColor } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GamesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    coachAccountId: string;
    studentId: string;
    sourceType: GameSourceType;
    sourceLabel?: string;
    studentColor: StudentColor;
    rawPgn: string;
    normalizedPgnHash: string;
    hasEngineAnnotations: boolean;
    annotationCoverage: import('../generated/prisma/client.js').AnnotationCoverage;
    reducedConfidenceWarning: string | null;
  }) {
    return this.prisma.game.create({ data });
  }

  async findDuplicate(studentId: string, normalizedPgnHash: string) {
    return this.prisma.game.findFirst({
      where: {
        studentId,
        normalizedPgnHash,
      },
      select: { id: true },
    });
  }

  async findOwnedGame(gameId: string, coachAccountId: string) {
    return this.prisma.game.findFirst({
      where: {
        id: gameId,
        coachAccountId,
      },
    });
  }

  update(gameId: string, data: Record<string, unknown>) {
    return this.prisma.game.update({
      where: { id: gameId },
      data,
    });
  }
}
