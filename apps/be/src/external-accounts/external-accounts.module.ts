import { Module } from '@nestjs/common';
import { GuardsModule } from '../shared/guards/guards.module.js';
import { ExternalAccountsController } from './external-accounts.controller.js';
import { ExternalAccountsService } from './external-accounts.service.js';

@Module({
  imports: [GuardsModule],
  controllers: [ExternalAccountsController],
  providers: [ExternalAccountsService],
})
export class ExternalAccountsModule {}
