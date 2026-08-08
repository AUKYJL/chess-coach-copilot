import { Module } from '@nestjs/common';
import { CoachStudentAccessGuard } from './coach-student-access.guard.js';

@Module({
  providers: [CoachStudentAccessGuard],
  exports: [CoachStudentAccessGuard],
})
export class GuardsModule {}
