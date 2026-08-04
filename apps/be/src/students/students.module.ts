import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller.js';
import { CoachStudentAccessGuard } from './guards/coach-student-access.guard.js';
import { StudentsService } from './students.service.js';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, CoachStudentAccessGuard],
  exports: [StudentsService],
})
export class StudentsModule {}
