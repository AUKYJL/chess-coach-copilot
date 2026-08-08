import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AnalysisClassifierService } from './classification/analysis-classifier.service.js';
import { AnnotationExtractorService } from './classification/annotation-extractor.service.js';
import { GenerationTraceService } from './classification/generation-trace.service.js';
import { SavedAnalysisInputMapper } from './classification/saved-analysis-input.mapper.js';
import { SavedOutputGenerationService } from './classification/saved-output-generation.service.js';
import { AnalysisJobsController } from './jobs/analysis-jobs.controller.js';
import { AnalysisJobsRepository } from './jobs/analysis-jobs.repository.js';
import { AnalysisJobsService } from './jobs/analysis-jobs.service.js';
import { PgnParserService } from './preparation/pgn-parser.service.js';
import { PgnPreparationService } from './preparation/pgn-preparation.service.js';
import { AnalysisQueriesService } from './results/analysis-queries.service.js';
import { AnalysisResultsRepository } from './results/analysis-results.repository.js';
import { AnalysisResultsService } from './results/analysis-results.service.js';
import { AnalysisController } from './results/analysis.controller.js';

@Module({
  imports: [PrismaModule, AuthModule, LlmModule],
  controllers: [AnalysisJobsController, AnalysisController],
  providers: [
    AnalysisJobsRepository,
    AnalysisJobsService,
    AnalysisResultsRepository,
    PgnParserService,
    AnnotationExtractorService,
    PgnPreparationService,
    AnalysisClassifierService,
    AnalysisQueriesService,
    AnalysisResultsService,
    GenerationTraceService,
    SavedAnalysisInputMapper,
    SavedOutputGenerationService,
  ],
  exports: [
    AnalysisJobsRepository,
    AnalysisJobsService,
    PgnPreparationService,
    AnalysisClassifierService,
    AnalysisQueriesService,
    AnalysisResultsService,
    GenerationTraceService,
    SavedAnalysisInputMapper,
    SavedOutputGenerationService,
  ],
})
export class AnalysisModule {}
