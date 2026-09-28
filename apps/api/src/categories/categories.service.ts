import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { categoryAllowsBarter } from './barter-policy';
import { AUTO_ATTRIBUTE_FIELDS, AUTO_ATTRIBUTE_OPTIONS } from './attribute-options';
import { catalogOwnerId, categoryRoot } from './category-hierarchy';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ title: 'asc' }],
      select: { id: true, slug: true, title: true, parentId: true },
    });
    const byId = new Map(categories.map((category) => [category.id, category]));
    return categories.map((category) => ({
      ...category,
      rootSlug: categoryRoot(category, byId)?.slug ?? null,
      barterAllowed: categoryAllowsBarter(categoryRoot(category, byId)?.slug ?? ''),
    }));
  }

  async attributeOptions(categoryId: string, scope: {
    fieldKey?: string; parentFieldKey?: string; parentValue?: string;
  } = {}) {
    const { fieldKey, parentFieldKey, parentValue } = scope;
    if ((parentFieldKey !== undefined || parentValue !== undefined) &&
        (!fieldKey || !parentFieldKey || !parentValue)) {
      throw new BadRequestException('fieldKey, parentFieldKey and parentValue are required together');
    }
    if (fieldKey !== undefined && !fieldKey.trim()) {
      throw new BadRequestException('fieldKey must not be empty');
    }
    const ownerId = await catalogOwnerId(this.prisma, categoryId);
    const options = await this.prisma.categoryAttributeOption.findMany({
      where: {
        categoryId: ownerId,
        ...(fieldKey ? { fieldKey,
          ...(parentFieldKey && parentValue
            ? { parentOption: { is: { categoryId: ownerId, fieldKey: parentFieldKey, value: parentValue } } }
            : { parentOptionId: null }),
        } : {}),
      },
      orderBy: [{ fieldKey: 'asc' }, { sortOrder: 'asc' }],
      select: {
        fieldKey: true, value: true, label: true,
        parentOption: { select: { categoryId: true, fieldKey: true, value: true } },
      },
    });
    return options.filter(({ parentOption }) => !parentOption || parentOption.categoryId === ownerId)
      .map(({ parentOption, ...option }) => ({
      ...option,
      ...(parentOption
        ? { parentFieldKey: parentOption.fieldKey, parentValue: parentOption.value }
        : {}),
      }));
  }

  async attributeSchema(categoryId: string) {
    const ownerId = await catalogOwnerId(this.prisma, categoryId);
    const category = await this.prisma.category.findUnique({
      where: { id: ownerId },
      select: {
        catalogRevision: true,
        attributeFields: {
          where: { isActive: true },
          orderBy: [{ sectionId: 'asc' }, { sortOrder: 'asc' }],
          select: { key: true, label: true, sectionId: true, sectionTitle: true, fieldType: true, parentKey: true },
        },
      },
    });
    return category ? { version: category.catalogRevision, optionsQueryVersion: 1, fields: category.attributeFields } : null;
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
      await this.prisma.category.upsert({
        where: { slug: 'passenger-cars' },
        create: { slug: 'passenger-cars', title: 'Легковые автомобили', parentId: auto.id },
        update: {},
      });
      await this.prisma.categoryAttributeField.createMany({
        data: AUTO_ATTRIBUTE_FIELDS.map(({ key, label }, sortOrder) => ({
          categoryId: auto.id, key, label, sectionId: 'auto_main',
          sectionTitle: 'Автомобиль', sortOrder,
        })),
        skipDuplicates: true,
      });
      await this.prisma.categoryAttributeOption.createMany({
        data: Object.entries(AUTO_ATTRIBUTE_OPTIONS).flatMap(([fieldKey, options]) =>
          options.map(([value, label], sortOrder) => ({ categoryId: auto.id, fieldKey, value, label, sortOrder }))),
        skipDuplicates: true,
      });
    }
  }
}
