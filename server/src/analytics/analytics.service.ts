import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salary } from '../salaries/entities/salary.entity';

export interface GroupStat {
  group: string;
  currency: string;
  headcount: number;
  avgSalary: string;
  minSalary: string;
  maxSalary: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Salary)
    private readonly salaries: Repository<Salary>,
  ) { }

  async overview() {
    const rows = await this.salaries
      .createQueryBuilder('s')
      .innerJoin('s.employee', 'e')
      .select('s.currency', 'currency')
      .addSelect('COUNT(*)', 'headcount')
      .addSelect('SUM(s.base_amount)', 'totalPayroll')
      .addSelect('AVG(s.base_amount)', 'avgSalary')
      .where('s.effective_to IS NULL')
      .andWhere("e.employment_status = 'active'")
      .groupBy('s.currency')
      .getRawMany();

    return rows.map((r) => ({
      currency: r.currency as string,
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
    const rows = await this.salaries
      .createQueryBuilder('s')
      .innerJoin('s.employee', 'e')
      .select(`${dimension}`, 'group')
      .addSelect('s.currency', 'currency')
      .addSelect('COUNT(*)', 'headcount')
      .addSelect('AVG(s.base_amount)', 'avgSalary')
      .addSelect('MIN(s.base_amount)', 'minSalary')
      .addSelect('MAX(s.base_amount)', 'maxSalary')
      .where('s.effective_to IS NULL')
      .andWhere("e.employment_status = 'active'")
      .groupBy(`${dimension}`)
      .addGroupBy('s.currency')
      .orderBy(`${dimension}`, 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      group: r.group as string,
      currency: r.currency as string,
      headcount: Number(r.headcount),
      avgSalary: Number(r.avgSalary).toFixed(2),
      minSalary: Number(r.minSalary).toFixed(2),
      maxSalary: Number(r.maxSalary).toFixed(2),
    }));
  }
}