import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { Salary } from './entities/salary.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class SalariesService {
  constructor(
    @InjectRepository(Salary)
    private readonly salaries: Repository<Salary>,
    private readonly dataSource: DataSource,
  ) { }

  async findHistory(employeeId: string): Promise<Salary[]> {
    const employee = await this.dataSource
      .getRepository(Employee)
      .findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.salaries.find({
      where: { employeeId },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async recordSalary(
    employeeId: string,
    dto: CreateSalaryDto,
  ): Promise<Salary> {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: employeeId },
      });
      if (!employee) {
        throw new NotFoundException(`Employee ${employeeId} not found`);
      }

      const newFrom = new Date(dto.effectiveFrom);

      const current = await manager.findOne(Salary, {
        where: { employeeId, effectiveTo: IsNull() },
      });

      if (current) {
        if (newFrom <= new Date(current.effectiveFrom)) {
          throw new BadRequestException(
            'effectiveFrom must be after the current salary’s effectiveFrom',
          );
        }
        const closeDate = new Date(newFrom);
        closeDate.setDate(closeDate.getDate() - 1);
        current.effectiveTo = closeDate;
        await manager.save(current);
      }

      const salary = manager.create(Salary, {
        employeeId,
        baseAmount: dto.baseAmount.toFixed(2),
        currency: dto.currency,
        effectiveFrom: newFrom,
        effectiveTo: null,
        payFrequency: dto.payFrequency,
      });

      return manager.save(salary);
    });
  }
}