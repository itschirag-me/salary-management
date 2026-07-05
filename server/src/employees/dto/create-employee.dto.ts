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
  @IsString()
  @MaxLength(20)
  employeeCode!: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(100)
  department!: string;

  @IsString()
  @MaxLength(150)
  jobTitle!: string;

  @IsISO31661Alpha2()
  country!: string;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus = EmploymentStatus.ACTIVE;

  @IsDateString()
  hireDate!: string;
}
