import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { PayFrequency } from '../../common/enums/pay-frequency.enum';

export class CreateSalaryDto {
  @ApiProperty({
    description: 'The base amount of the salary',
    minimum: 0.01,
    example: 75000,
  })
  @IsPositive()
  baseAmount!: number;

  @ApiProperty({
    description: 'Three-letter currency code (ISO 4217)',
    example: 'USD',
  })
  @IsISO4217CurrencyCode()
  currency!: string;

  @ApiProperty({
    description: 'Effective date of the salary (YYYY-MM-DD)',
    example: '2026-07-05',
  })
  @IsDateString()
  effectiveFrom!: string;

  @ApiProperty({
    description: 'The payment frequency of the salary',
    enum: PayFrequency,
    example: PayFrequency.MONTHLY,
  })
  @IsEnum(PayFrequency)
  payFrequency!: PayFrequency;
}

