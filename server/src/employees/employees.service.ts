// src/employees/employees.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { EmploymentStatus } from '../common/enums/employment-status.enum';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employee.dto';
import { Employee } from './entities/employee.entity';

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) { }

  async findAll(query: QueryEmployeesDto): Promise<PaginatedResult<Employee>> {
    const { page, limit, department, country, status, search } = query;

    const qb = this.employees
      .createQueryBuilder('e')
      .leftJoinAndMapOne(
        'e.currentSalary',
        'e.salaries',
        's',
        's.effective_to IS NULL',
      );

    if (department) qb.andWhere('e.department = :department', { department });
    if (country) qb.andWhere('e.country = :country', { country });
    if (status) qb.andWhere('e.employment_status = :status', { status });

    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('e.first_name ILIKE :s')
            .orWhere('e.last_name ILIKE :s')
            .orWhere("CONCAT(e.first_name, ' ', e.last_name) ILIKE :s")
            .orWhere('e.email ILIKE :s')
            .orWhere('e.employee_code ILIKE :s');
        }),
        { s: `%${search}%` },
      );
    }

    qb.orderBy('e.employee_code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employees
      .createQueryBuilder('e')
      .leftJoinAndMapOne(
        'e.currentSalary',
        'e.salaries',
        's',
        's.effective_to IS NULL',
      )
      .where('e.id = :id', { id })
      .getOne();

    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const employee = this.employees.create(dto);
    return this.employees.save(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    return this.employees.save(employee);
  }

  async remove(id: string): Promise<Employee> {
    const employee = await this.findOne(id);
    employee.employmentStatus = EmploymentStatus.TERMINATED;
    return this.employees.save(employee);
  }
}