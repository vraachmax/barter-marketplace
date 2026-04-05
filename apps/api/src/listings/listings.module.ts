import { Module, OnModuleInit } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SearchModule } from '../search/search.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [SearchModule, AnalyticsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule implements OnModuleInit {
  constructor(private listings: ListingsService) {}

  async onModuleInit() {
    await this.listings.ensureSeed();
    await this.listings.ensureCoordinates();
  }
}

