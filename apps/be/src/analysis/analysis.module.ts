import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AppLoggingModule } from '../shared/logging/logging.module.js';
import { AnalysisClassifierService } from './classification/analysis-classifier.service.js';
import { AnnotationExtractorService } from './classification/annotation-extractor.service.js';
import { EngineEvidenceCandidateDetectorService } from './classification/engine-evidence-candidate-detector.service.js';
import { GenerationTraceService } from './classification/generation-trace.service.js';
import { SavedAnalysisInputMapper } from './classification/saved-analysis-input.mapper.js';
import { SavedOutputGenerationService } from './classification/saved-output-generation.service.js';
import { AnalysisJobsController } from './jobs/analysis-jobs.controller.js';
import { AnalysisJobEventsService } from './jobs/analysis-job-events.service.js';
import { AnalysisJobsRepository } from './jobs/analysis-jobs.repository.js';
import { AnalysisJobsService } from './jobs/analysis-jobs.service.js';
import { PgnParserService } from './preparation/pgn-parser.service.js';
import { PgnPreparationService } from './preparation/pgn-preparation.service.js';
import { EngineEvidenceService } from './preparation/engine-evidence.service.js';
import { StockfishGameAnalyzerService } from './engine/stockfish-game-analyzer.service.js';
import { StockfishUciAdapter } from './engine/stockfish-uci.adapter.js';
import { EngineAnalysisService } from './engine/engine-analysis.service.js';
import { AnalysisQueriesService } from './results/analysis-queries.service.js';
import { AnalysisReviewsService } from './results/analysis-reviews.service.js';
import { AnalysisResultsRepository } from './results/analysis-results.repository.js';
import { AnalysisResultsService } from './results/analysis-results.service.js';
import { AnalysisController } from './results/analysis.controller.js';

@Module({
  imports: [PrismaModule, AuthModule, LlmModule, AppLoggingModule],
  controllers: [AnalysisJobsController, AnalysisController],
  providers: [
    AnalysisJobsRepository,
    AnalysisJobEventsService,
    AnalysisJobsService,
    AnalysisResultsRepository,
    PgnParserService,
    EngineEvidenceService,
    StockfishUciAdapter,
    StockfishGameAnalyzerService,
    EngineAnalysisService,
    AnnotationExtractorService,
    EngineEvidenceCandidateDetectorService,
    PgnPreparationService,
    AnalysisClassifierService,
    AnalysisQueriesService,
    AnalysisReviewsService,
    AnalysisResultsService,
    GenerationTraceService,
    SavedAnalysisInputMapper,
    SavedOutputGenerationService,
  ],
  exports: [
    AnalysisJobsRepository,
    AnalysisJobEventsService,
    AnalysisJobsService,
    PgnParserService,
    PgnPreparationService,
    StockfishGameAnalyzerService,
    AnalysisClassifierService,
    AnalysisQueriesService,
    AnalysisReviewsService,
    AnalysisResultsService,
    GenerationTraceService,
    SavedAnalysisInputMapper,
    SavedOutputGenerationService,
    EngineAnalysisService,
  ],
})
export class AnalysisModule {}
