import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';

export class LoginDto {
  @ApiProperty({ example: swaggerEntityExamples.coach.email })
  @IsEmail()
  email: string;

  @ApiProperty({ example: swaggerEntityExamples.coach.password })
  @IsString()
  @MinLength(8)
  password: string;
}
