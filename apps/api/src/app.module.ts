import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ChatsModule } from './chats/chats.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ListingsModule } from './listings/listings.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    AnalyticsModule,
    AuthModule,
    CategoriesModule,
    SearchModule,
    ListingsModule,
    FavoritesModule,
    ChatsModule,
    ReviewsModule,
    UsersModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
