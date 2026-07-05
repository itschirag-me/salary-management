import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalariesService } from './salaries.service';
import { Salary } from './entities/salary.entity';
import { Employee } from '../employees/entities/employee.entity';
import { PayFrequency } from '../common/enums/pay-frequency.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SalariesService', () => {
  let service: SalariesService;
  let repository: Repository<Salary>;
  let dataSource: DataSource;

  const mockEmployee = {
    id: 'employee-uuid',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockSalary = {
    id: 'salary-uuid',
    employeeId: 'employee-uuid',
    baseAmount: '5000.00',
    currency: 'USD',
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
    payFrequency: PayFrequency.MONTHLY,
  };

  const mockRepository = {
    find: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
    }),
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalariesService,
        {
          provide: getRepositoryToken(Salary),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SalariesService>(SalariesService);
    repository = module.get<Repository<Salary>>(getRepositoryToken(Salary));
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findHistory', () => {
    it('should return salary history for an employee', async () => {
      const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue(mockEmployee) };
      jest.spyOn(dataSource, 'getRepository').mockReturnValue(mockEmployeeRepo as any);
      mockRepository.find.mockResolvedValue([mockSalary]);

      const result = await service.findHistory('employee-uuid');

      expect(result).toEqual([mockSalary]);
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledWith({ where: { id: 'employee-uuid' } });
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { employeeId: 'employee-uuid' },
        order: { effectiveFrom: 'DESC' },
      });
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue(null) };
      jest.spyOn(dataSource, 'getRepository').mockReturnValue(mockEmployeeRepo as any);

      await expect(service.findHistory('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordSalary', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null); // Employee check

      const dto = {
        baseAmount: 6000,
        currency: 'USD',
        effectiveFrom: '2026-02-01',
        payFrequency: PayFrequency.MONTHLY,
      };

      await expect(service.recordSalary('invalid-uuid', dto)).rejects.toThrow(NotFoundException);
    });

    it('should record salary when no previous active salary exists', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockEmployee) // Employee lookup
        .mockResolvedValueOnce(null); // Current active salary lookup

      mockEntityManager.create.mockReturnValue(mockSalary);
      mockEntityManager.save.mockResolvedValue(mockSalary);

      const dto = {
        baseAmount: 5000,
        currency: 'USD',
        effectiveFrom: '2026-01-01',
        payFrequency: PayFrequency.MONTHLY,
      };

      const result = await service.recordSalary('employee-uuid', dto);

      expect(result).toEqual(mockSalary);
      expect(mockEntityManager.create).toHaveBeenCalledWith(Salary, {
        employeeId: 'employee-uuid',
        baseAmount: '5000.00',
        currency: 'USD',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        payFrequency: PayFrequency.MONTHLY,
      });
      expect(mockEntityManager.save).toHaveBeenCalledWith(mockSalary);
    });

    it('should close current salary and append new salary tier', async () => {
      const activeSalary = { ...mockSalary };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockEmployee) // Employee lookup
        .mockResolvedValueOnce(activeSalary); // Current active salary lookup

      const newSalary = {
        ...mockSalary,
        id: 'new-salary-uuid',
        baseAmount: '6000.00',
        effectiveFrom: new Date('2026-02-01'),
      };

      mockEntityManager.create.mockReturnValue(newSalary);
      mockEntityManager.save.mockResolvedValue(newSalary);

      const dto = {
        baseAmount: 6000,
        currency: 'USD',
        effectiveFrom: '2026-02-01',
        payFrequency: PayFrequency.MONTHLY,
      };

      const result = await service.recordSalary('employee-uuid', dto);

      expect(result).toEqual(newSalary);
      expect(activeSalary.effectiveTo).toEqual(new Date('2026-01-31')); // closed active salary 1 day prior
      expect(mockEntityManager.save).toHaveBeenCalledWith(activeSalary);
      expect(mockEntityManager.save).toHaveBeenCalledWith(newSalary);
    });

    it('should throw BadRequestException if new effectiveFrom is prior to current salary start date', async () => {
      const activeSalary = { ...mockSalary, effectiveFrom: new Date('2026-02-01') };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockEmployee) // Employee lookup
        .mockResolvedValueOnce(activeSalary); // Current active salary lookup

      const dto = {
        baseAmount: 6000,
        currency: 'USD',
        effectiveFrom: '2026-01-15', // Invalid date (prior to active salary)
        payFrequency: PayFrequency.MONTHLY,
      };

      await expect(service.recordSalary('employee-uuid', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
