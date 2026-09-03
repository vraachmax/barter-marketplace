import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PresenceModule } from '../presence/presence.module';
import { SupportModule } from '../support/support.module';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';
import { getJwtSecret } from '../config/security';

@Module({
  imports: [
    AnalyticsModule,
    PresenceModule,
    SupportModule,
    JwtModule.register({
      secret: getJwtSecret(),
    }),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
