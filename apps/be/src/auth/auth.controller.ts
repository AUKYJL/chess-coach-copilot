import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { APP_ENVIRONMENT, appConfig, jwtConfig } from '../config/index.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { AuthService } from './auth.service.js';
import {
  AuthResponse,
  CoachProfileResponse,
  RefreshAccessTokenResponse,
} from './dto/auth-session.response.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import {
  getRefreshCookieBaseOptions,
  getRefreshCookieOptions,
} from './refresh-cookie.util.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY)
    private readonly appConfiguration: ConfigType<typeof appConfig>,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(
      dto,
      this.getRequestContext(request),
    );

    this.setNoStore(response);
    this.setRefreshCookie(response, result.refreshToken);

    return result.body;
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(
      dto,
      this.getRequestContext(request),
    );

    this.setNoStore(response);
    this.setRefreshCookie(response, result.refreshToken);

    return result.body;
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshAccessTokenResponse> {
    const result = await this.authService.refresh(
      this.getRefreshTokenFromCookies(request),
      this.getRequestContext(request),
    );

    this.setNoStore(response);
    this.setRefreshCookie(response, result.refreshToken);

    return result.body;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(
      request.cookies?.[this.getRefreshCookieName()] as string | undefined,
    );

    this.setNoStore(response);
    this.clearRefreshCookie(response);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@CurrentCoach() coach: AuthenticatedCoach): Promise<CoachProfileResponse> {
    return this.authService.me(coach.coachAccountId);
  }

  private getRequestContext(request: Request): {
    userAgent?: string;
    ipAddress?: string;
  } {
    return {
      userAgent: request.get('user-agent') ?? undefined,
      ipAddress: request.ip,
    };
  }

  private getRefreshTokenFromCookies(request: Request): string {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const refreshToken = cookies?.[this.getRefreshCookieName()];

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException('Refresh token cookie is required');
    }

    return refreshToken;
  }

  private getRefreshCookieName(): string {
    return this.jwtConfiguration.refreshCookieName;
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(
      this.getRefreshCookieName(),
      refreshToken,
      getRefreshCookieOptions({
        isProduction:
          this.appConfiguration.nodeEnv === APP_ENVIRONMENT.PRODUCTION,
        maxAgeMs: this.jwtConfiguration.refreshTtlSeconds * 1000,
      }),
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.getRefreshCookieName(),
      getRefreshCookieBaseOptions({
        isProduction:
          this.appConfiguration.nodeEnv === APP_ENVIRONMENT.PRODUCTION,
      }),
    );
  }

  private setNoStore(response: Response): void {
    response.setHeader('Cache-Control', 'no-store');
  }
}
