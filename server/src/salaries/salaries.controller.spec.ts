import { Test, TestingModule } from '@nestjs/testing';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import { PayFrequency } from '../common/enums/pay-frequency.enum';

describe('SalariesController', () => {
  let controller: SalariesController;
  let service: SalariesService;

  const mockSalary = {
    id: 'salary-uuid',
    employeeId: 'employee-uuid',
    baseAmount: '5000.00',
    currency: 'USD',
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
    payFrequency: PayFrequency.MONTHLY,
  };

  const mockSalariesService = {
    findHistory: jest.fn().mockResolvedValue([mockSalary]),
    recordSalary: jest.fn().mockResolvedValue(mockSalary),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalariesController],
      providers: [
        {
          provide: SalariesService,
          useValue: mockSalariesService,
        },
      ],
    }).compile();

    controller = module.get<SalariesController>(SalariesController);
    service = module.get<SalariesService>(SalariesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.findHistory', async () => {
    const result = await controller.findHistory('employee-uuid');
    expect(result).toEqual([mockSalary]);
    expect(service.findHistory).toHaveBeenCalledWith('employee-uuid');
  });

  it('should call service.recordSalary', async () => {
    const dto = {
      baseAmount: 5000,
      currency: 'USD',
      effectiveFrom: '2026-01-01',
      payFrequency: PayFrequency.MONTHLY,
    };
    const result = await controller.recordSalary('employee-uuid', dto as any);
    expect(result).toEqual(mockSalary);
    expect(service.recordSalary).toHaveBeenCalledWith('employee-uuid', dto);
  });
});
