import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { categoryAllowsBarter } from './barter-policy';
import { AUTO_ATTRIBUTE_FIELDS, AUTO_ATTRIBUTE_OPTIONS } from './attribute-options';
import { catalogOwnerId, categoryRoot } from './category-hierarchy';
import { carCatalog, CAR_CATALOG_REVISION } from './car-catalog';

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
      await this.ensureCarCatalog(auto.id);
    }
  }

  /** Resume safely after an interrupted seed; publish the fields only after all options exist. */
  private async ensureCarCatalog(categoryId: string) {
    const category = await this.prisma.category.findUniqueOrThrow({
      where: { id: categoryId }, select: { catalogRevision: true },
    });
    if (category.catalogRevision >= CAR_CATALOG_REVISION) return;

    const batchSize = 400;
    for (let offset = 0; offset < carCatalog.makes.length; offset += batchSize) {
      await this.prisma.categoryAttributeOption.createMany({
        data: carCatalog.makes.slice(offset, offset + batchSize).map((make, index) => ({
          categoryId, fieldKey: 'auto_make', value: make.id, label: make.name,
          sortOrder: offset + index,
        })), skipDuplicates: true,
      });
    }
    const makes = await this.prisma.categoryAttributeOption.findMany({
      where: { categoryId, fieldKey: 'auto_make' }, select: { id: true, value: true },
    });
    const makeIds = new Map(makes.map(make => [make.value, make.id]));
    if (carCatalog.makes.some(make => !makeIds.has(make.id))) throw new Error('VehiclesDB make import incomplete');
    for (let offset = 0; offset < carCatalog.models.length; offset += batchSize) {
      await this.prisma.categoryAttributeOption.createMany({
        data: carCatalog.models.slice(offset, offset + batchSize).map((model, index) => ({
          categoryId, fieldKey: 'auto_model', value: model.id, label: model.name,
          parentOptionId: makeIds.get(model.makeId)!, sortOrder: offset + index,
        })), skipDuplicates: true,
      });
    }
    const imported = await this.prisma.categoryAttributeOption.count({
      where: { categoryId, fieldKey: 'auto_model', value: { in: carCatalog.models.map(model => model.id) } },
    });
    if (imported !== carCatalog.models.length) throw new Error('VehiclesDB model import incomplete');
    await this.prisma.$transaction(async tx => {
      await tx.categoryAttributeField.createMany({
        data: [
          { categoryId, key: 'auto_make', label: 'Марка', sectionId: 'auto_main', sectionTitle: 'Автомобиль', sortOrder: 4 },
          { categoryId, key: 'auto_model', label: 'Модель', sectionId: 'auto_main', sectionTitle: 'Автомобиль', sortOrder: 5, parentKey: 'auto_make' },
        ], skipDuplicates: true,
      });
      await tx.category.update({ where: { id: categoryId }, data: { catalogRevision: CAR_CATALOG_REVISION } });
    });
  }
}
