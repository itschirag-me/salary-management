import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { HealthResponseDto } from './common/dto/health-response.dto';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Get()
  // getHello(): string {
  //   return this.appService.getHello();
  // }

  @Public()
  @Get('/health')
  @ApiOperation({
    summary: 'System health check',
    description: 'Retrieves the status, uptime, and metadata of the application.',
  })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Service is healthy and fully operational.',
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
