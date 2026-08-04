import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { jwtConfig } from '../config/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from './auth-crypto.js';
import {
  AuthResponse,
  CoachProfileResponse,
  RefreshAccessTokenResponse,
} from './dto/auth-session.response.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type { AccessTokenPayload } from './types/access-token-payload.type.js';
import type { AuthTokens } from './types/auth-tokens.type.js';
import type { RefreshTokenPayload } from './types/refresh-token-payload.type.js';

type CoachProfileRecord = {
  id: string;
  email: string;
  displayName: string;
};

type RequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

type AuthResult = {
  body: AuthResponse;
  refreshToken: string;
};

type RefreshResult = {
  body: RefreshAccessTokenResponse;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async register(
    dto: RegisterDto,
    context: RequestContext,
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existingCoach = await this.prisma.coachAccount.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingCoach) {
      throw new ConflictException('Email is already registered');
    }

    const coach = await this.prisma.coachAccount.create({
      data: {
        email,
        displayName: dto.displayName.trim(),
        passwordHash: await hashPassword(dto.password),
      },
    });
    const tokens = await this.issueAuthTokens(coach.id, context);

    return {
      body: {
        accessToken: tokens.accessToken,
        coach: this.toCoachProfile(coach),
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const coach = await this.prisma.coachAccount.findUnique({
      where: { email },
    });

    if (!coach) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await verifyPassword(
      coach.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueAuthTokens(coach.id, context);

    return {
      body: {
        accessToken: tokens.accessToken,
        coach: this.toCoachProfile(coach),
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(
    refreshToken: string,
    context: RequestContext,
  ): Promise<RefreshResult> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const coach = await this.prisma.coachAccount.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!coach) {
      throw new UnauthorizedException('Coach account not found');
    }

    const tokens = await this.rotateRefreshToken({
      currentRefreshToken: refreshToken,
      currentTokenId: payload.jti,
      coachAccountId: payload.sub,
      context,
    });

    return {
      body: {
        accessToken: tokens.accessToken,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      await this.refreshTokenService.revoke({
        id: payload.jti,
        coachAccountId: payload.sub,
        tokenHash: hashRefreshToken(refreshToken),
      });
    } catch {
      return;
    }
  }

  async me(coachAccountId: string): Promise<CoachProfileResponse> {
    const coach = await this.prisma.coachAccount.findUnique({
      where: { id: coachAccountId },
    });

    if (!coach) {
      throw new UnauthorizedException('Coach account not found');
    }

    return this.toCoachProfile(coach);
  }

  private async issueAuthTokens(
    coachAccountId: string,
    context: RequestContext,
  ): Promise<AuthTokens> {
    const tokens = await this.createAuthTokens(coachAccountId);

    await this.refreshTokenService.create({
      id: tokens.refreshTokenId,
      coachAccountId,
      tokenHash: tokens.refreshTokenHash,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: tokens.refreshExpiresAt,
    });

    return tokens;
  }

  private async rotateRefreshToken(input: {
    currentRefreshToken: string;
    currentTokenId: string;
    coachAccountId: string;
    context: RequestContext;
  }): Promise<AuthTokens> {
    const nextTokens = await this.createAuthTokens(input.coachAccountId);

    await this.refreshTokenService.rotate({
      currentTokenId: input.currentTokenId,
      currentTokenHash: hashRefreshToken(input.currentRefreshToken),
      coachAccountId: input.coachAccountId,
      nextToken: {
        id: nextTokens.refreshTokenId,
        coachAccountId: input.coachAccountId,
        tokenHash: nextTokens.refreshTokenHash,
        userAgent: input.context.userAgent,
        ipAddress: input.context.ipAddress,
        expiresAt: nextTokens.refreshExpiresAt,
      },
    });

    return nextTokens;
  }

  private async createAuthTokens(coachAccountId: string): Promise<AuthTokens> {
    const { accessSecret, accessTtlSeconds, refreshSecret, refreshTtlSeconds } =
      this.jwtConfiguration;
    const refreshTokenId = randomUUID();
    const refreshExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

    const accessPayload: AccessTokenPayload = {
      sub: coachAccountId,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: coachAccountId,
      jti: refreshTokenId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessTtlSeconds,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshTtlSeconds,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      refreshExpiresAt,
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.jwtConfiguration.refreshSecret,
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private toCoachProfile(coach: CoachProfileRecord): CoachProfileResponse {
    return {
      id: coach.id,
      email: coach.email,
      displayName: coach.displayName,
    };
  }
}
