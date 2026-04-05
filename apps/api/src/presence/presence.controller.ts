import { Controller, Get, Param } from '@nestjs/common';
import { PresenceService } from './presence.service';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /** Публично: видно только факт «в сети» и время последнего визита (как на маркетплейсах). */
  @Get('users/:userId')
  getUserPresence(@Param('userId') userId: string) {
    return {
      online: this.presence.isOnline(userId),
      lastSeenAt: this.presence.getLastSeenAt(userId),
    };
  }
}
