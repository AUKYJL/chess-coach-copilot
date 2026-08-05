import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GamesRepository } from './games.repository.js';
import { GamesService } from './games.service.js';

@Module({
  imports: [PrismaModule],
  providers: [GamesRepository, GamesService],
  exports: [GamesRepository, GamesService],
})
export class GamesModule {}
