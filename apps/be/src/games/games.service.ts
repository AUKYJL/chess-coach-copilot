import { Injectable } from '@nestjs/common';
import {
  AnnotationCoverage,
  GameSourceType,
  StudentColor,
} from '../generated/prisma/client.js';
import { GamesRepository } from './games.repository.js';

@Injectable()
export class GamesService {
  constructor(private readonly gamesRepository: GamesRepository) {}

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
    const duplicate = await this.gamesRepository.findDuplicate(
      data.studentId,
      data.normalizedPgnHash,
    );

    const game = await this.gamesRepository.create({
      ...data,
      sourceType: GameSourceType.MANUAL_PGN,
    });

    return {
      game,
      isDuplicate: Boolean(duplicate),
    };
  }
}
