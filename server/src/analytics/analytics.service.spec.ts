import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Salary } from '../salaries/entities/salary.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: Repository<Salary>;

  const mockRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Salary),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repository = module.get<Repository<Salary>>(getRepositoryToken(Salary));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('overview', () => {
    it('should return overview stats grouped by currency', async () => {
      const mockRawRows = [
        { currency: 'USD', headcount: '10', totalPayroll: '1000000.00', avgSalary: '100000.00' },
        { currency: 'EUR', headcount: '5', totalPayroll: '450000.00', avgSalary: '90000.00' },
      ];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRawRows),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.overview();
      expect(result).toEqual([
        { currency: 'USD', headcount: 10, totalPayroll: '1000000.00', avgSalary: '100000.00' },
        { currency: 'EUR', headcount: 5, totalPayroll: '450000.00', avgSalary: '90000.00' },
      ]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('s.employee', 'e');
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('s.currency');
    });
  });

  describe('byCountry', () => {
    it('should return stats grouped by country', async () => {
      const mockRawRows = [
        { group: 'US', currency: 'USD', headcount: '10', avgSalary: '85000.00', minSalary: '50000.00', maxSalary: '120000.00' },
      ];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRawRows),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.byCountry();
      expect(result).toEqual([
        { group: 'US', currency: 'USD', headcount: 10, avgSalary: '85000.00', minSalary: '50000.00', maxSalary: '120000.00' },
      ]);
    });
  });

  describe('byDepartment', () => {
    it('should return stats grouped by department', async () => {
      const mockRawRows = [
        { group: 'Engineering', currency: 'USD', headcount: '5', avgSalary: '100000.00', minSalary: '80000.00', maxSalary: '120000.00' },
      ];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRawRows),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.byDepartment();
      expect(result).toEqual([
        { group: 'Engineering', currency: 'USD', headcount: 5, avgSalary: '100000.00', minSalary: '80000.00', maxSalary: '120000.00' },
      ]);
    });
  });
});
