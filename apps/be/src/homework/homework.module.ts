import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';
import { HomeworkController } from './homework.controller.js';
import { HomeworkService } from './homework.service.js';

@Module({
  imports: [AuthModule, StudentsModule, AnalysisModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
