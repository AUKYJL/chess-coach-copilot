import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import { CoachStudentAccessGuard } from '../shared/guards/coach-student-access.guard.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { ListStudentGamesQueryDto } from './dto/list-student-games.query.js';
import { GamesService } from './games.service.js';

@ApiTags('Games')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(CoachStudentAccessGuard)
  @Get('students/:studentId/games')
  async listStudentGames(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
    @Query() query: ListStudentGamesQueryDto,
  ) {
    return this.gamesService.listStudentGames({
      coachAccountId: coach.coachAccountId,
      studentId,
      limit: query.limit,
      cursor: query.cursor,
      analysisStatus: query.analysisStatus,
    });
  }

  @Get('games/:gameId')
  getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('gameId') gameId: string,
  ) {
    return this.gamesService.getOwnedGame(gameId, coach.coachAccountId);
  }

  @ApiQuery({ name: 'download', required: false, type: Boolean })
  @Get('games/:gameId/pgn')
  async getPgn(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('gameId') gameId: string,
  ) {
    const game = await this.gamesService.getOwnedGamePgn(
      gameId,
      coach.coachAccountId,
    );

    return {
      gameId: game.id,
      rawPgn: game.rawPgn,
    };
  }
}
