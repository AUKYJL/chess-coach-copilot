import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ExternalPlatform } from '../../generated/prisma/client.js';

export class CreateExternalAccountDto {
  @ApiProperty({ enum: ExternalPlatform })
  @IsEnum(ExternalPlatform)
  platform: ExternalPlatform;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username: string;
}
