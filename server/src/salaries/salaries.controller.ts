import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SalariesService } from './salaries.service';
import { CreateSalaryDto } from './dto/create-salary.dto';

@Controller('employees/:employeeId/salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) { }

  @Get()
  findHistory(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.salariesService.findHistory(employeeId);
  }

  @Post()
  recordSalary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateSalaryDto,
  ) {
    return this.salariesService.recordSalary(employeeId, dto);
  }
}