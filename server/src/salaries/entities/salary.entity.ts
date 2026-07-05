import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayFrequency } from '../../common/enums/pay-frequency.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Index('idx_salary_employee_effective', ['employeeId', 'effectiveFrom'])
@Entity('salaries')
export class Salary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, (employee) => employee.salaries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'base_amount', type: 'numeric', precision: 12, scale: 2 })
  baseAmount: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({
    name: 'pay_frequency',
    type: 'enum',
    enum: PayFrequency,
    default: PayFrequency.ANNUAL,
  })
  payFrequency: PayFrequency;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
