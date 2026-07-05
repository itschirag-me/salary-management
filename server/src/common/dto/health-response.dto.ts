import { ApiProperty } from '@nestjs/swagger';

class HealthDataDto {
  @ApiProperty({ example: 'Salary Management System', description: 'Name of the service' })
  service!: string;

  @ApiProperty({ example: 'v1', description: 'API version' })
  version!: string;

  @ApiProperty({ example: 123.45, description: 'Uptime of the server in seconds' })
  uptime!: number;

  @ApiProperty({ example: '2026-07-05T21:49:17.000Z', description: 'Current server time' })
  timestamp!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'OK', description: 'Overall system health status' })
  status!: string;

  @ApiProperty({ example: 'OK', description: 'Detail status message' })
  message!: string;

  @ApiProperty({ type: HealthDataDto, description: 'Detailed health attributes' })
  data!: HealthDataDto;
}
