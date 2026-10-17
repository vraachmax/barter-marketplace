import { AuthGuard } from '@nestjs/passport';
import { analyticsDays } from './seller-analytics';
import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';

/**
 * Сбор поведенческих событий для рекомендаций и ранжирования.
 * Авторизация опциональна: при валидном JWT подставляется user_id.
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('seller')
  seller(@Req() req: { user: { id: string } }, @Query('days') rawDays?: string) {
    const days = analyticsDays(rawDays);
    if (!days) throw new BadRequestException('invalid_analytics_period');
    return this.analytics.sellerSummary(req.user.id, days);
  }

  @Post('events')
  track(@Req() req: any, @Body() dto: TrackEventsDto) {
    return this.analytics.trackFromRequest(req, dto);
  }
}
