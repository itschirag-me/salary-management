import { ApiProperty } from '@nestjs/swagger';
import { Employee } from '../entities/employee.entity';

class PaginatedMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 50, description: 'Page limit size' })
  limit!: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total!: number;

  @ApiProperty({ example: 2, description: 'Total pages available' })
  totalPages!: number;
}

export class PaginatedEmployeeResponseDto {
  @ApiProperty({ type: [Employee], description: 'List of employee records' })
  data!: Employee[];

  @ApiProperty({ type: PaginatedMetaDto, description: 'Pagination metadata' })
  meta!: PaginatedMetaDto;
}
