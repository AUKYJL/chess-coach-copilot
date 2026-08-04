import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtAccessStrategy } from './jwt-access.strategy.js';
import { RefreshTokenService } from './refresh-token.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    JwtAccessGuard,
    JwtAccessStrategy,
  ],
  exports: [PassportModule, JwtModule, JwtAccessGuard],
})
export class AuthModule {}
