import { IsBoolean } from 'class-validator';

export class SetStudentArchiveDto {
  @IsBoolean()
  archived: boolean;
}
