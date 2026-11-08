import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Get(':id/attribute-options')
  attributeOptions(
    @Param('id') id: string,
    @Query('fieldKey') fieldKey?: string,
    @Query('parentFieldKey') parentFieldKey?: string,
    @Query('parentValue') parentValue?: string,
  ) {
    return this.categories.attributeOptions(id, { fieldKey, parentFieldKey, parentValue });
  }

  @Get('coverage')
  catalogCoverage() { return this.categories.catalogCoverage(); }

  @Get(':id/auto-fill')
  autoFill(@Param('id') id:string,@Query('selected') selected?:string) {
    return this.categories.autoFill(id,selected);
  }

    @Get(':id/attribute-schema')
  attributeSchema(@Param('id') id: string) {
    return this.categories.attributeSchema(id);
  }
}

