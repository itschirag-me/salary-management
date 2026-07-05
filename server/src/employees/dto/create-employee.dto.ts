import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsISO31661Alpha2,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { EmploymentStatus } from '../../common/enums/employment-status.enum';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Unique employee code identifier',
    maxLength: 20,
    example: 'EMP001',
  })
  @IsString()
  @MaxLength(20)
  employeeCode!: string;

  @ApiProperty({
    description: 'First name of the employee',
    maxLength: 100,
    example: 'John',
  })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the employee',
    maxLength: 100,
    example: 'Doe',
  })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    description: 'Email address of the employee',
    maxLength: 255,
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: 'Department of the employee',
    maxLength: 100,
    example: 'Engineering',
  })
  @IsString()
  @MaxLength(100)
  department!: string;

  @ApiProperty({
    description: 'Job title of the employee',
    maxLength: 150,
    example: 'Software Engineer',
  })
  @IsString()
  @MaxLength(150)
  jobTitle!: string;

  @ApiProperty({
    description: '2-letter country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsISO31661Alpha2()
  country!: string;

  @ApiProperty({
    description: 'Employment status of the employee',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
    example: EmploymentStatus.ACTIVE,
  })
  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus = EmploymentStatus.ACTIVE;

  @ApiProperty({
    description: 'Date when the employee was hired (YYYY-MM-DD)',
    example: '2026-07-05',
  })
  @IsDateString()
  hireDate!: string;
}

