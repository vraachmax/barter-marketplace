import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeilisearchService } from './meilisearch.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class SearchModule {}
