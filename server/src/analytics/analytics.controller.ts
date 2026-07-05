import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { OverviewStatDto, GroupStatDto, DistributionBucketDto } from './dto/analytics-responses.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Analytics')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Unauthorized access. Session cookie is missing or invalid.',
})
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('overview')
  @ApiOperation({
    summary: 'Retrieve payroll overview stats',
    description: 'Aggregates active headcount, total payroll costs, and average salaries grouped by payment currency.',
  })
  @ApiOkResponse({
    type: [OverviewStatDto],
    description: 'Successfully computed payroll overview statistics.',
  })
  overview() {
    return this.analyticsService.overview();
  }

  @Get('by-country')
  @ApiOperation({
    summary: 'Retrieve payroll stats by country',
    description: 'Aggregates employee counts, minimum, maximum, and average salaries, grouped by employee country and payment currency.',
  })
  @ApiOkResponse({
    type: [GroupStatDto],
    description: 'Successfully computed country-level payroll statistics.',
  })
  byCountry() {
    return this.analyticsService.byCountry();
  }

  @Get('by-department')
  @ApiOperation({
    summary: 'Retrieve payroll stats by department',
    description: 'Aggregates employee counts, minimum, maximum, and average salaries, grouped by employee department and payment currency.',
  })
  @ApiOkResponse({
    type: [GroupStatDto],
    description: 'Successfully computed department-level payroll statistics.',
  })
  byDepartment() {
    return this.analyticsService.byDepartment();
  }

  @Get('distribution')
  @ApiOperation({
    summary: 'Retrieve salary distribution',
    description:
      'Buckets current active salaries into fixed-width bands, grouped by payment currency, for histogram display.',
  })
  @ApiOkResponse({
    type: [DistributionBucketDto],
    description: 'Successfully computed salary distribution buckets.',
  })
  distribution() {
    return this.analyticsService.distribution();
  }
}
