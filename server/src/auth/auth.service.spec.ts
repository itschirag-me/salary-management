import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersRepository: any;
  let mockJwtService: any;
  const mockBcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    mockUsersRepository = {
      findOne: jest.fn(),
    };
    mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockBcryptCompare.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndSign', () => {
    it('should validate user credentials and return a JWT token', async () => {
      const mockUser = { id: 'user-uuid', email: 'user@example.com', passwordHash: 'hashed_pass' };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt_token');

      const result = await service.validateAndSign('user@example.com', 'password123');

      expect(result).toBe('jwt_token');
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-uuid', email: 'user@example.com' });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.validateAndSign('invalid@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const mockUser = { id: 'user-uuid', email: 'user@example.com', passwordHash: 'hashed_pass' };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.validateAndSign('user@example.com', 'wrong_pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
