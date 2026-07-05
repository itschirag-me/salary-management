import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockOverview = [
    { currency: 'USD', headcount: 10, totalPayroll: '1000000.00', avgSalary: '100000.00' },
  ];

  const mockGroupStats = [
    { group: 'US', currency: 'USD', headcount: 10, avgSalary: '85000.00', minSalary: '50000.00', maxSalary: '120000.00' },
  ];

  const mockAnalyticsService = {
    overview: jest.fn().mockResolvedValue(mockOverview),
    byCountry: jest.fn().mockResolvedValue(mockGroupStats),
    byDepartment: jest.fn().mockResolvedValue(mockGroupStats),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.overview', async () => {
    const result = await controller.overview();
    expect(result).toEqual(mockOverview);
    expect(service.overview).toHaveBeenCalled();
  });

  it('should call service.byCountry', async () => {
    const result = await controller.byCountry();
    expect(result).toEqual(mockGroupStats);
    expect(service.byCountry).toHaveBeenCalled();
  });

  it('should call service.byDepartment', async () => {
    const result = await controller.byDepartment();
    expect(result).toEqual(mockGroupStats);
    expect(service.byDepartment).toHaveBeenCalled();
  });
});
