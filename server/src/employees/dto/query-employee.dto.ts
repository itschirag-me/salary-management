import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EmploymentStatus } from 'src/common/enums/employment-status.enum';

export class QueryEmployeesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // cap page size — never let a client request all 10k at once
  limit: number = 50;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
