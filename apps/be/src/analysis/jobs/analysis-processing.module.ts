import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis.module.js';
import { HomeworkModule } from '../../homework/homework.module.js';
import { ProgressModule } from '../../progress/progress.module.js';
import { ReportsModule } from '../../reports/reports.module.js';
import { AnalysisProcessor } from './analysis.processor.js';
import { EngineAnalysisProcessor } from '../engine/engine-analysis.processor.js';
import { EngineAnalysisReconciliationService } from '../engine/engine-analysis-reconciliation.service.js';

@Module({
  imports: [AnalysisModule, ReportsModule, HomeworkModule, ProgressModule],
  providers: [
    AnalysisProcessor,
    EngineAnalysisProcessor,
    EngineAnalysisReconciliationService,
  ],
  exports: [AnalysisProcessor, EngineAnalysisProcessor],
})
export class AnalysisProcessingModule {}
