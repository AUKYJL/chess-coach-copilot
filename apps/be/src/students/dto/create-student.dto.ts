import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
