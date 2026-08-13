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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { APP_ENVIRONMENT, appConfig, jwtConfig } from '../config/index.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import {
  swaggerRequestExamples,
  swaggerResponseExamples,
} from '../shared/swagger/swagger-examples.js';
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
@ApiExtraModels(
  RegisterDto,
  LoginDto,
  AuthResponse,
  CoachProfileResponse,
  RefreshAccessTokenResponse,
)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY)
    private readonly appConfiguration: ConfigType<typeof appConfig>,
  ) {}

  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(RegisterDto) }],
      example: swaggerRequestExamples.auth.register,
    },
  })
  @ApiCreatedResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(AuthResponse) }],
      example: swaggerResponseExamples.auth.session,
    },
  })
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

  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(LoginDto) }],
      example: swaggerRequestExamples.auth.login,
    },
  })
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(AuthResponse) }],
      example: swaggerResponseExamples.auth.session,
    },
  })
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

  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(RefreshAccessTokenResponse) }],
      example: swaggerResponseExamples.auth.refresh,
    },
  })
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

  @ApiNoContentResponse({ description: 'Refresh session revoked.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(
      this.getCookieValue(request, this.getRefreshCookieName()),
    );

    this.setNoStore(response);
    this.clearRefreshCookie(response);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(CoachProfileResponse) }],
      example: swaggerResponseExamples.auth.coach,
    },
  })
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
    const refreshToken = this.getCookieValue(
      request,
      this.getRefreshCookieName(),
    );

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException('Refresh token cookie is required');
    }

    return refreshToken;
  }

  private getCookieValue(
    request: Request,
    cookieName: string,
  ): string | undefined {
    const cookies: unknown = request.cookies;

    if (!this.isCookieBag(cookies)) {
      return undefined;
    }

    const value = cookies[cookieName];

    return typeof value === 'string' ? value : undefined;
  }

  private isCookieBag(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
