import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GamesModule } from '../games/games.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AnalysisJobsController } from './analysis-jobs.controller.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';
import { AnalysisJobsService } from './analysis-jobs.service.js';
import { AnalysisResultsRepository } from './analysis-results.repository.js';
import { AnalysisController } from './analysis.controller.js';
import { PgnPreparationService } from './pgn-preparation.service.js';
import { PgnParserService } from './parsers/pgn-parser.service.js';
import { AnalysisClassifierService } from './services/analysis-classifier.service.js';
import { AnalysisResultsService } from './services/analysis-results.service.js';
import { AnnotationExtractorService } from './services/annotation-extractor.service.js';
import { GenerationTraceService } from './services/generation-trace.service.js';
import { AnalysisProcessor } from './workers/analysis.processor.js';

@Module({
  imports: [PrismaModule, AuthModule, GamesModule, LlmModule],
  controllers: [AnalysisController, AnalysisJobsController],
  providers: [
    AnalysisJobsRepository,
    AnalysisJobsService,
    AnalysisResultsRepository,
    PgnParserService,
    AnnotationExtractorService,
    PgnPreparationService,
    AnalysisClassifierService,
    AnalysisResultsService,
    GenerationTraceService,
    AnalysisProcessor,
  ],
  exports: [AnalysisJobsService, PgnPreparationService],
})
export class AnalysisModule {}
