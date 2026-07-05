import { ApiProperty } from '@nestjs/swagger';

export class OverviewStatDto {
  @ApiProperty({ example: 'USD', description: 'Three-letter currency code (ISO 4217)' })
  currency!: string;

  @ApiProperty({ example: 120, description: 'Total headcount of active employees in this currency' })
  headcount!: number;

  @ApiProperty({ example: '9500000.00', description: 'Sum of all active base salaries in this currency' })
  totalPayroll!: string;

  @ApiProperty({ example: '79166.67', description: 'Average base salary for this currency' })
  avgSalary!: string;
}

export class GroupStatDto {
  @ApiProperty({ example: 'Engineering', description: 'Group dimension value (e.g. department name or country code)' })
  group!: string;

  @ApiProperty({ example: 'USD', description: 'Three-letter currency code (ISO 4217)' })
  currency!: string;

  @ApiProperty({ example: 10, description: 'Total headcount of active employees in this group' })
  headcount!: number;

  @ApiProperty({ example: '85000.00', description: 'Average active base salary in this group' })
  avgSalary!: string;

  @ApiProperty({ example: '50000.00', description: 'Minimum active base salary in this group' })
  minSalary!: string;

  @ApiProperty({ example: '1200000.00', description: 'Maximum active base salary in this group' })
  maxSalary!: string;
}
