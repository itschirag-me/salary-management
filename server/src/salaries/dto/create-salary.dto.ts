import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { PayFrequency } from '../../common/enums/pay-frequency.enum';

export class CreateSalaryDto {
  @IsPositive()
  baseAmount!: number;

  @IsISO4217CurrencyCode()
  currency!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsEnum(PayFrequency)
  payFrequency!: PayFrequency;
}
