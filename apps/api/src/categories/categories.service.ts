import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { categoryAllowsBarter } from './barter-policy';
import { AUTO_ATTRIBUTE_OPTIONS } from './attribute-options';

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

  async attributeOptions(categoryId: string) {
    const options = await this.prisma.categoryAttributeOption.findMany({
      where: { categoryId },
      orderBy: [{ fieldKey: 'asc' }, { sortOrder: 'asc' }],
      select: {
        fieldKey: true, value: true, label: true,
        parentOption: { select: { categoryId: true, fieldKey: true, value: true } },
      },
    });
    return options.filter(({ parentOption }) => !parentOption || parentOption.categoryId === categoryId)
      .map(({ parentOption, ...option }) => ({
      ...option,
      ...(parentOption
        ? { parentFieldKey: parentOption.fieldKey, parentValue: parentOption.value }
        : {}),
      }));
  }

  async ensureSeed() {
    const count = await this.prisma.category.count();
    if (count === 0) await this.prisma.category.createMany({
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

    const auto = await this.prisma.category.findUnique({ where: { slug: 'auto' }, select: { id: true } });
    if (auto) {
      await this.prisma.categoryAttributeOption.createMany({
        data: Object.entries(AUTO_ATTRIBUTE_OPTIONS).flatMap(([fieldKey, options]) =>
          options.map(([value, label], sortOrder) => ({ categoryId: auto.id, fieldKey, value, label, sortOrder }))),
        skipDuplicates: true,
      });
    }
  }
}
