import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

import { validationSchema } from 'config';
import { EmployeesModule } from './employees/employees.module';
import { SalariesModule } from './salaries/salaries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: validationSchema,
    }),
    EmployeesModule,
    SalariesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
