import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoginResponseDto, LogoutResponseDto } from './dto/auth-responses.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) { }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user via email and password, and sets a secure httpOnly JWT session cookie in the browser.',
  })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'Successfully authenticated. The JWT cookie has been established.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid credentials provided.',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.validateAndSign(dto.email, dto.password);

    res.cookie('access_token', token, {
      httpOnly: true, // JS can't read it — XSS can't steal the token
      secure: this.config.get('COOKIE_SECURE') === 'true', // HTTPS-only in prod
      sameSite: 'lax', // CSRF mitigation
      maxAge: 24 * 60 * 60 * 1000, // 1 day, match JWT_EXPIRES_IN
      path: '/',
    });

    return { message: 'Logged in' };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'User logout',
    description: 'Clears the JWT access cookie from the browser session.',
  })
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Successfully logged out and session cookie cleared.',
  })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out' };
  }
}
