import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [AuthModule, StudentsModule, AnalysisModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
