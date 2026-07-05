import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

  const mockAuthService = {
    validateAndSign: jest.fn().mockResolvedValue('mocked_jwt_token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('false'),
  };

  const mockResponse: any = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and set access_token cookie', async () => {
      const dto = { email: 'user@example.com', password: 'password123' };

      const result = await controller.login(dto, mockResponse);

      expect(result).toEqual({ message: 'Logged in' });
      expect(authService.validateAndSign).toHaveBeenCalledWith(dto.email, dto.password);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'mocked_jwt_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear access_token cookie', () => {
      const result = controller.logout(mockResponse);

      expect(result).toEqual({ message: 'Logged out' });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
    });
  });
});
