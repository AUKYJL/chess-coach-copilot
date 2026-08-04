import { Module } from '@nestjs/common';
import { CoachStudentAccessGuard } from '../students/guards/coach-student-access.guard.js';
import { ExternalAccountsController } from './external-accounts.controller.js';
import { ExternalAccountsService } from './external-accounts.service.js';

@Module({
  controllers: [ExternalAccountsController],
  providers: [ExternalAccountsService, CoachStudentAccessGuard],
})
export class ExternalAccountsModule {}
