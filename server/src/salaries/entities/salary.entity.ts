import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PayFrequency } from '../../common/enums/pay-frequency.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Index('idx_salary_employee_effective', ['employeeId', 'effectiveFrom'])
@Entity('salaries')
export class Salary {
  @ApiProperty({
    example: '876e4567-e89b-12d3-a456-426614174999',
    description: 'Unique database identifier of the salary record (UUID)',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The identifier of the associated employee (UUID)',
  })
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ApiProperty({
    type: () => Employee,
    description: 'The associated employee details',
  })
  @ManyToOne(() => Employee, (employee) => employee.salaries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ApiProperty({
    example: '75000.00',
    description: 'Base amount of the salary (stored as decimal/numeric string)',
  })
  @Column({ name: 'base_amount', type: 'numeric', precision: 12, scale: 2 })
  baseAmount!: string;

  @ApiProperty({
    example: 'USD',
    description: 'Three-letter currency code (ISO 4217)',
  })
  @Column({ type: 'char', length: 3 })
  currency!: string;

  @ApiProperty({
    example: '2026-07-05',
    description: 'Start date of this salary tier (YYYY-MM-DD)',
  })
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: Date;

  @ApiProperty({
    example: '2026-08-01',
    nullable: true,
    description: 'End date of this salary tier, or null if it is the current active tier (YYYY-MM-DD)',
  })
  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: Date | null;

  @ApiProperty({
    enum: PayFrequency,
    example: PayFrequency.MONTHLY,
    description: 'Salary payout frequency',
  })
  @Column({
    name: 'pay_frequency',
    type: 'enum',
    enum: PayFrequency,
    default: PayFrequency.ANNUAL,
  })
  payFrequency!: PayFrequency;

  @ApiProperty({
    example: '2026-07-05T21:49:17.000Z',
    description: 'Timestamp when this salary record was logged',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
