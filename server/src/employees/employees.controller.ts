// src/employees/employees.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employee.dto';
import { PaginatedEmployeeResponseDto } from './dto/paginated-employee-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { Employee } from './entities/employee.entity';

@ApiTags('Employees')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Unauthorized access. Session cookie is missing or invalid.',
})
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Get()
  @ApiOperation({
    summary: 'List employees with pagination',
    description: 'Retrieves a paginated list of employee records. Supports filtering by department, country, status, or search query.',
  })
  @ApiOkResponse({
    type: PaginatedEmployeeResponseDto,
    description: 'Successfully retrieved employee list.',
  })
  findAll(@Query() query: QueryEmployeesDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get employee details',
    description: 'Retrieves detailed profile information and current salary for a single employee by their UUID.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique database identifier (UUID) of the employee',
  })
  @ApiOkResponse({
    type: Employee,
    description: 'Successfully found employee record.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid UUID format provided.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Employee with the specified UUID not found.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create employee record',
    description: 'Creates a new employee profile in the database.',
  })
  @ApiCreatedResponse({
    type: Employee,
    description: 'Employee profile record has been successfully created.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation failed or request payload is malformed.',
  })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update employee fields',
    description: 'Updates specific fields on an employee profile (excluding employee code and salary details).',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique database identifier (UUID) of the employee to update',
  })
  @ApiOkResponse({
    type: Employee,
    description: 'Employee profile successfully updated.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation failed, invalid UUID, or request payload is malformed.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Employee with the specified UUID not found.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Terminate employee (soft-delete)',
    description: 'Changes an employee status to terminated. This acts as a soft-delete (preserves payroll history).',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique database identifier (UUID) of the employee to terminate',
  })
  @ApiOkResponse({
    type: Employee,
    description: 'Employee record status successfully set to terminated.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid UUID format provided.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Employee with the specified UUID not found.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.remove(id);
  }
}