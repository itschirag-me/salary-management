import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false, description: 'Indicates if the request succeeded' })
  success!: boolean;

  @ApiProperty({ example: 400, description: 'The HTTP status code' })
  statusCode!: number;

  @ApiProperty({ example: '/api/v1/employees/abc', description: 'The requested route path' })
  path!: string;

  @ApiProperty({ example: '2026-07-05T21:49:17.000Z', description: 'Timestamp when the error occurred' })
  timestamp!: string;

  @ApiProperty({
    description: 'Detailed error message or validation errors list',
    oneOf: [
      { type: 'string', example: 'Employee abc not found' },
      { type: 'array', items: { type: 'string' }, example: ['email must be an email'] },
    ],
  })
  error!: string | string[];
}
