import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule, StudentsModule, AnalysisModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
