import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.category.findMany({
      orderBy: [{ title: 'asc' }],
      select: { id: true, slug: true, title: true, parentId: true },
    });
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

