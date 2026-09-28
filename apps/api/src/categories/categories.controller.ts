import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Get(':id/attribute-options')
  attributeOptions(@Param('id') id: string) {
    return this.categories.attributeOptions(id);
  }
}

