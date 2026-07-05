import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { EmploymentStatus } from '../common/enums/employment-status.enum';
import { NotFoundException } from '@nestjs/common';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let repository: Repository<Employee>;

  const mockEmployee = {
    id: 'employee-uuid',
    employeeCode: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    country: 'US',
    employmentStatus: EmploymentStatus.ACTIVE,
    hireDate: new Date('2026-01-01'),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((employee) => Promise.resolve({ id: 'employee-uuid', ...employee })),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    repository = module.get<Repository<Employee>>(getRepositoryToken(Employee));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of employees', async () => {
      const mockQueryBuilder = {
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockEmployee], 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const query = { page: 1, limit: 10, department: 'Engineering', country: 'US', status: EmploymentStatus.ACTIVE, search: 'John' };
      const result = await service.findAll(query);

      expect(result.data).toEqual([mockEmployee]);
      expect(result.meta.total).toBe(1);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('e');
      expect(mockQueryBuilder.leftJoinAndMapOne).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // department, country, status, search
    });
  });

  describe('findOne', () => {
    it('should return a single employee', async () => {
      const mockQueryBuilder = {
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockEmployee),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findOne('employee-uuid');
      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException if employee not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new employee', async () => {
      const dto = {
        employeeCode: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        department: 'HR',
        jobTitle: 'HR Manager',
        country: 'US',
        employmentStatus: EmploymentStatus.ACTIVE,
        hireDate: '2026-02-01',
      };

      const result = await service.create(dto as any);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.firstName).toBe('Jane');
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockEmployee as any);
      const dto = { firstName: 'Johnny' };

      const result = await service.update('employee-uuid', dto);
      expect(findOneSpy).toHaveBeenCalledWith('employee-uuid');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.firstName).toBe('Johnny');
      findOneSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should soft-delete employee by setting status to TERMINATED', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({ ...mockEmployee } as any);

      const result = await service.remove('employee-uuid');
      expect(result.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(mockRepository.save).toHaveBeenCalled();
      findOneSpy.mockRestore();
    });
  });
});
