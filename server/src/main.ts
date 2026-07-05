import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/exception/exception.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('/api/v1');

  app.use(cookieParser());

  // CORS must allow credentials so the browser sends/receives the cookie
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('ACME Salary Management & HRMS API')
    .setDescription(
      'Detailed API documentation for the ACME HRMS, including employee records, salary history management, analytics reporting, and JWT authentication.',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
      description: 'JWT access token stored in httpOnly cookie access_token',
    })
    .addTag('Auth', 'Authentication endpoints (login, logout)')
    .addTag('Employees', 'Employee profile and record management')
    .addTag('Salaries', 'Employee salary history tracking and logging')
    .addTag('Analytics', 'Organizational analytics (headcount, payroll aggregates)')
    .addTag('System', 'System-level endpoints (health checks)')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
