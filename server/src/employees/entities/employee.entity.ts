import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { EmploymentStatus } from '../../common/enums/employment-status.enum';
import { Salary } from '../../salaries/entities/salary.entity';

@Entity('employees')
export class Employee {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique database identifier of the employee (UUID)',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 'EMP001',
    description: 'Unique employee code identifier',
  })
  @Column({ name: 'employee_code', type: 'varchar', length: 20, unique: true })
  employeeCode!: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the employee',
  })
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the employee',
  })
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the employee',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @ApiProperty({
    example: 'Engineering',
    description: 'Department name',
  })
  @Index()
  @Column({ type: 'varchar', length: 100 })
  department!: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'Job title',
  })
  @Column({ name: 'job_title', type: 'varchar', length: 150 })
  jobTitle!: string;

  @ApiProperty({
    example: 'US',
    description: '2-letter country code (ISO 3166-1 alpha-2)',
  })
  @Index()
  @Column({ type: 'char', length: 2 }) // ISO 3166-1 alpha-2
  country!: string;

  @ApiProperty({
    enum: EmploymentStatus,
    example: EmploymentStatus.ACTIVE,
    description: 'Employment status of the employee',
  })
  @Column({
    name: 'employment_status',
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  employmentStatus!: EmploymentStatus;

  @ApiProperty({
    example: '2026-07-05',
    description: 'Hire date of the employee (YYYY-MM-DD)',
  })
  @Column({ name: 'hire_date', type: 'date' })
  hireDate!: Date;

  @ApiProperty({
    type: () => Salary,
    isArray: true,
    description: 'Salary history records for this employee',
  })
  @OneToMany(() => Salary, (salary) => salary.employee)
  salaries!: Salary[];

  @ApiProperty({
    example: '2026-07-05T21:49:17.000Z',
    description: 'Record creation timestamp',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-07-05T21:49:17.000Z',
    description: 'Record last updated timestamp',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
