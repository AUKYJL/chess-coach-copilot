import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ExternalPlatform } from '../../generated/prisma/client.js';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';

export class UpdateExternalAccountDto {
  @ApiProperty({
    enum: ExternalPlatform,
    example: swaggerEntityExamples.externalAccount.platform,
  })
  @IsEnum(ExternalPlatform)
  platform: ExternalPlatform;

  @ApiProperty({ example: swaggerEntityExamples.externalAccount.username })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username: string;
}
