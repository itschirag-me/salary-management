import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { SalariesService } from './salaries.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { Salary } from './entities/salary.entity';

@ApiTags('Salaries')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Unauthorized access. Session cookie is missing or invalid.',
})
@Controller('employees/:employeeId/salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) { }

  @Get()
  @ApiOperation({
    summary: 'Retrieve employee salary history',
    description: 'Returns the full salary change history for the specified employee, sorted by effective date in descending order.',
  })
  @ApiParam({
    name: 'employeeId',
    type: 'string',
    format: 'uuid',
    description: 'Unique database identifier (UUID) of the employee',
  })
  @ApiOkResponse({
    type: [Salary],
    description: 'Successfully retrieved salary history.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid employee UUID format provided.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Employee with the specified UUID not found.',
  })
  findHistory(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.salariesService.findHistory(employeeId);
  }

  @Post()
  @ApiOperation({
    summary: 'Record a new salary tier',
    description: 'Appends a new salary record for the specified employee. This transaction closes the previous salary tier (updating its effectiveTo date) and creates the new current active tier.',
  })
  @ApiParam({
    name: 'employeeId',
    type: 'string',
    format: 'uuid',
    description: 'Unique database identifier (UUID) of the employee',
  })
  @ApiCreatedResponse({
    type: Salary,
    description: 'Successfully registered new salary tier.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation failed, invalid UUID, or the effectiveFrom date is prior to or equal to the current salary start date.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Employee with the specified UUID not found.',
  })
  recordSalary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateSalaryDto,
  ) {
    return this.salariesService.recordSalary(employeeId, dto);
  }
}