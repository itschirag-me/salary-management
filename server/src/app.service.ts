import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
    return {
      status: 'OK',
      message: 'OK',
      data: {
        service: 'Salary Management System',
        version: 'v1',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
