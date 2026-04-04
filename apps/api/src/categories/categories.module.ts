import { Module, OnModuleInit } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private categories: CategoriesService) {}

  async onModuleInit() {
    await this.categories.ensureSeed();
  }
}

