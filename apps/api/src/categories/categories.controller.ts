import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get(':id/attributes')
  attributes(@Param('id') id: string) { return this.categories.attributes(id); }

  @Get()
  list() {
    return this.categories.list();
  }
}

