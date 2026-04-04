import { Body, Controller, Post, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';

/**
 * Сбор поведенческих событий для рекомендаций и ранжирования.
 * Авторизация опциональна: при валидном JWT подставляется user_id.
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Post('events')
  track(@Req() req: any, @Body() dto: TrackEventsDto) {
    return this.analytics.trackFromRequest(req, dto);
  }
}
