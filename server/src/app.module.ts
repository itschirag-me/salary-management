import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmployeesModule } from './employees/employees.module';
import { SalariesModule } from './salaries/salaries.module';
import { Env, validationSchema } from './config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>(Env.DB_HOST),
        port: config.getOrThrow<number>(Env.DB_PORT),
        username: config.getOrThrow<string>(Env.DB_USERNAME),
        password: config.getOrThrow<string>(Env.DB_PASSWORD),
        database: config.getOrThrow<string>(Env.DB_DATABASE),
        // Load entities via glob — matches compiled .js in prod and .ts in dev
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // Migrations own the schema. NEVER synchronize.
        synchronize: false,
        // Don't auto-run migrations on boot — run them explicitly via CLI
        migrationsRun: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    EmployeesModule,
    SalariesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: JwtAuthGuard, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
