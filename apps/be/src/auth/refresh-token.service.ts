import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type PersistRefreshTokenInput = {
  id: string;
  coachAccountId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

type RotateRefreshTokenInput = {
  currentTokenId: string;
  currentTokenHash: string;
  coachAccountId: string;
  nextToken: PersistRefreshTokenInput;
};

type RevokeRefreshTokenInput = {
  id: string;
  coachAccountId: string;
  tokenHash: string;
};

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: PersistRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: input,
    });
  }

  async rotate(input: RotateRefreshTokenInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const revokedAt = new Date();
      const updated = await tx.refreshToken.updateMany({
        where: {
          id: input.currentTokenId,
          coachAccountId: input.coachAccountId,
          tokenHash: input.currentTokenHash,
          revokedAt: null,
          expiresAt: {
            gt: revokedAt,
          },
        },
        data: {
          revokedAt,
          replacedByTokenId: input.nextToken.id,
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException('Refresh token is not active');
      }

      await tx.refreshToken.create({
        data: input.nextToken,
      });
    });
  }

  async revoke(input: RevokeRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        id: input.id,
        coachAccountId: input.coachAccountId,
        tokenHash: input.tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
