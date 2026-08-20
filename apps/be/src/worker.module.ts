import { Module } from '@nestjs/common';
import { AnalysisProcessingModule } from './analysis/jobs/analysis-processing.module.js';
import { AppModule } from './app.module.js';

@Module({
  imports: [AppModule, AnalysisProcessingModule],
})
export class WorkerModule {}
