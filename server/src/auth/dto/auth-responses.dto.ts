import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'Logged in', description: 'Status message confirming successful login' })
  message!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out', description: 'Status message confirming successful logout' })
  message!: string;
}
