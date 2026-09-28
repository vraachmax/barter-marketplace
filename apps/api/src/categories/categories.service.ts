import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { categoryAllowsBarter } from './barter-policy';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ title: 'asc' }],
      select: { id: true, slug: true, title: true, parentId: true },
    });
    return categories.map((category) => ({
      ...category,
      barterAllowed: categoryAllowsBarter(category.slug),
    }));
  }

  async attributes(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (!category) throw new NotFoundException('category_not_found');
    const fields = await this.prisma.catalogField.findMany({
      where: { categorySlug: category.slug }, orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      select: { key: true, label: true, dependsOnKey: true, options: {
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
        select: { value: true, label: true, parentValue: true, enabled: true },
      } },
    });
    return { version: 1, fields };
  }

  async ensureSeed() {
    const count = await this.prisma.category.count();
    if (count > 0) return;

    await this.prisma.category.createMany({
      data: [
        { slug: 'auto', title: 'Авто' },
        { slug: 'realty', title: 'Недвижимость' },
        { slug: 'job', title: 'Работа' },
        { slug: 'services', title: 'Услуги' },
        { slug: 'electronics', title: 'Электроника' },
        { slug: 'home', title: 'Для дома и дачи' },
        { slug: 'clothes', title: 'Одежда и обувь' },
        { slug: 'kids', title: 'Детские товары' },
        { slug: 'hobby', title: 'Хобби и отдых' },
      ],
    });
  }
}
