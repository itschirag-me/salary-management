import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmploymentStatus } from '../common/enums/employment-status.enum';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: EmployeesService;

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

  const mockEmployeesService = {
    findAll: jest.fn().mockResolvedValue({
      data: [mockEmployee],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }),
    findOne: jest.fn().mockResolvedValue(mockEmployee),
    create: jest.fn().mockResolvedValue(mockEmployee),
    update: jest.fn().mockResolvedValue(mockEmployee),
    remove: jest.fn().mockResolvedValue({ ...mockEmployee, employmentStatus: EmploymentStatus.TERMINATED }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.findAll', async () => {
    const query = { page: 1, limit: 50 };
    const result = await controller.findAll(query as any);
    expect(result.data).toEqual([mockEmployee]);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('should call service.findOne', async () => {
    const result = await controller.findOne('employee-uuid');
    expect(result).toEqual(mockEmployee);
    expect(service.findOne).toHaveBeenCalledWith('employee-uuid');
  });

  it('should call service.create', async () => {
    const dto = { firstName: 'John' };
    const result = await controller.create(dto as any);
    expect(result).toEqual(mockEmployee);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.update', async () => {
    const dto = { firstName: 'Johnny' };
    const result = await controller.update('employee-uuid', dto as any);
    expect(result).toEqual(mockEmployee);
    expect(service.update).toHaveBeenCalledWith('employee-uuid', dto);
  });

  it('should call service.remove', async () => {
    const result = await controller.remove('employee-uuid');
    expect(result.employmentStatus).toBe(EmploymentStatus.TERMINATED);
    expect(service.remove).toHaveBeenCalledWith('employee-uuid');
  });
});
