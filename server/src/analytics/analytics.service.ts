import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salary } from '../salaries/entities/salary.entity';

export interface CurrencyOverview {
  currency: string;
  headcount: number;
  totalPayroll: string;
  avgSalary: string;
}

export interface GroupStat {
  group: string;
  currency: string;
  headcount: number;
  avgSalary: string;
  minSalary: string;
  maxSalary: string;
}

export interface DistributionBucket {
  currency: string;
  bucket: string;
  lowerBound: number;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Salary)
    private readonly salaries: Repository<Salary>,
  ) { }

  private baseQuery() {
    return this.salaries
      .createQueryBuilder('s')
      .innerJoin('s.employee', 'e')
      .where('s.effective_to IS NULL')
      .andWhere("e.employment_status = 'active'");
  }

  async overview(): Promise<CurrencyOverview[]> {
    const rows = await this.baseQuery()
      .select('s.currency', 'currency')
      .addSelect('COUNT(*)', 'headcount')
      .addSelect('SUM(s.base_amount)', 'totalPayroll')
      .addSelect('AVG(s.base_amount)', 'avgSalary')
      .groupBy('s.currency')
      .orderBy('s.currency', 'ASC')
      .getRawMany<{
        currency: string;
        headcount: string;
        totalPayroll: string;
        avgSalary: string;
      }>();

    return rows.map((r) => ({
      currency: r.currency,
      headcount: Number(r.headcount),
      totalPayroll: Number(r.totalPayroll).toFixed(2),
      avgSalary: Number(r.avgSalary).toFixed(2),
    }));
  }

  async byCountry(): Promise<GroupStat[]> {
    return this.groupedStats('e.country');
  }

  async byDepartment(): Promise<GroupStat[]> {
    return this.groupedStats('e.department');
  }

  private async groupedStats(dimension: string): Promise<GroupStat[]> {
    const rows = await this.baseQuery()
      .select(dimension, 'group')
      .addSelect('s.currency', 'currency')
      .addSelect('COUNT(*)', 'headcount')
      .addSelect('AVG(s.base_amount)', 'avgSalary')
      .addSelect('MIN(s.base_amount)', 'minSalary')
      .addSelect('MAX(s.base_amount)', 'maxSalary')
      .groupBy(dimension)
      .addGroupBy('s.currency')
      .orderBy(dimension, 'ASC')
      .getRawMany<{
        group: string;
        currency: string;
        headcount: string;
        avgSalary: string;
        minSalary: string;
        maxSalary: string;
      }>();

    return rows.map((r) => ({
      group: r.group,
      currency: r.currency,
      headcount: Number(r.headcount),
      avgSalary: Number(r.avgSalary).toFixed(2),
      minSalary: Number(r.minSalary).toFixed(2),
      maxSalary: Number(r.maxSalary).toFixed(2),
    }));
  }

  async distribution(): Promise<DistributionBucket[]> {
    const BUCKET_SIZE = 50_000;
    const BUCKET_COUNT = 10; // 0 → 500k, then an overflow bucket

    const rows = await this.baseQuery()
      .select('s.currency', 'currency')
      .addSelect(
        `width_bucket(s.base_amount, 0, :maxRange, :buckets)`,
        'bucket_index',
      )
      .addSelect('COUNT(*)', 'count')
      .setParameters({
        maxRange: BUCKET_SIZE * BUCKET_COUNT,
        buckets: BUCKET_COUNT,
      })
      .groupBy('s.currency')
      .addGroupBy('bucket_index')
      .orderBy('s.currency', 'ASC')
      .addOrderBy('bucket_index', 'ASC')
      .getRawMany<{ currency: string; bucket_index: string; count: string }>();

    return rows.map((r) => {
      const idx = Number(r.bucket_index);
      const lower = (idx - 1) * BUCKET_SIZE;
      const upper = idx * BUCKET_SIZE;
      const label =
        idx > BUCKET_COUNT
          ? `${BUCKET_SIZE * BUCKET_COUNT / 1000}k+`
          : `${lower / 1000}k–${upper / 1000}k`;
      return {
        currency: r.currency,
        bucket: label,
        lowerBound: lower,
        count: Number(r.count),
      };
    });
  }
}