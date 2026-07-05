import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHealth: jest.fn().mockReturnValue({
              status: 'OK',
              message: 'OK',
              data: {
                service: 'Salary Management System',
                version: 'v1',
                uptime: 100,
                timestamp: '2026-07-05T21:49:17.000Z',
              },
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('health', () => {
    it('should return health status data', () => {
      const result = appController.getHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('OK');
      expect(result.data.service).toBe('Salary Management System');
      expect(appService.getHealth).toHaveBeenCalled();
    });
  });
});
