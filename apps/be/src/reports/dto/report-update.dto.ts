import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ReportContentUpdateDto {
  @ApiPropertyOptional({
    example:
      'Резюме\nСильная дебютная подготовка, но в тактике были поспешные решения.',
  })
  @IsString()
  @MinLength(1)
  text: string;
}

export class ReportUpdateDto {
  @ApiPropertyOptional({ example: 'Coach report: Italian Game review' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    example: {
      text: 'Резюме\nМиттельшпиль читался лучше, но форсирующие ходы проверялись не всегда.',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportContentUpdateDto)
  content?: ReportContentUpdateDto;
}
