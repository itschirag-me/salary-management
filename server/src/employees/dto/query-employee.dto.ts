import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { EmploymentStatus } from '../../common/enums/employment-status.enum';

export class QueryEmployeesDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // cap page size — never let a client request all 10k at once
  limit: number = 50;

  @ApiPropertyOptional({
    description: 'Filter employees by department name',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter employees by 2-letter country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter employees by employment status',
    enum: EmploymentStatus,
    example: EmploymentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiPropertyOptional({
    description: 'Search term to match against first name, last name, or email',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

