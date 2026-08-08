import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis.module.js';
import { HomeworkModule } from '../../homework/homework.module.js';
import { ProgressModule } from '../../progress/progress.module.js';
import { ReportsModule } from '../../reports/reports.module.js';
import { AnalysisProcessor } from './analysis.processor.js';

@Module({
  imports: [AnalysisModule, ReportsModule, HomeworkModule, ProgressModule],
  providers: [AnalysisProcessor],
  exports: [AnalysisProcessor],
})
export class AnalysisProcessingModule {}
