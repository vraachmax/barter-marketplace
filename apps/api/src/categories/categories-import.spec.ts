import { CategoriesService } from './categories.service';
import catalog from './vehiclesdb-car-2026.09.1.json';
import { PrismaService } from '../prisma/prisma.service';

describe('VehiclesDB seed', () => {
  it('loads parent-scoped models, commits revision last and does not re-import', async () => {
    const rows = new Map<string, { id: string; value: string; fieldKey: string; parentOptionId?: string }>();
    const order: string[] = [];
    let revision = 1;
    const option = {
      createMany: jest.fn(async ({ data }: { data: Array<{ fieldKey: string; value: string; parentOptionId?: string }> }) => {
        for (const item of data) {
          const key = `${item.fieldKey}:${item.value}`;
          if (!rows.has(key)) rows.set(key, { ...item, id: key });
        }
      }),
      findMany: jest.fn(async () => [...rows.values()].filter(row => row.fieldKey === 'auto_make')),
      count: jest.fn(async () => [...rows.values()].filter(row => row.fieldKey === 'auto_model').length),
    };
    const field = { createMany: jest.fn(async ({ data }: { data: Array<{ key: string }> }) => {
      if (data.some(item => item.key === 'auto_make')) order.push('fields');
    }) };
    const category = {
      count: jest.fn(async () => 1),
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) => where.slug === 'auto' ? { id: 'auto-id' } : null),
      findUniqueOrThrow: jest.fn(async () => ({ catalogRevision: revision })),
      upsert: jest.fn(async () => undefined),
      update: jest.fn(async ({ data }: { data: { catalogRevision: number } }) => { order.push('revision'); revision = data.catalogRevision; }),
    };
    const prisma = {
      category, categoryAttributeOption: option, categoryAttributeField: field,
      $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ category, categoryAttributeField: field }),
    } as unknown as PrismaService;
    const service = new CategoriesService(prisma);
    await service.ensureSeed();
    expect(rows.size).toBeGreaterThanOrEqual(catalog.makes.length + catalog.models.length);
    const sample = catalog.models.find(model => model.makeId === 'lada');
    expect(sample).toBeDefined();
    expect(rows.get(`auto_model:${sample!.id}`)?.parentOptionId).toBe('auto_make:lada');
    expect(order).toEqual(['fields', 'revision']);
    const calls = option.createMany.mock.calls.length;
    await service.ensureSeed();
    expect(option.createMany.mock.calls.length).toBe(calls + 1); // small starter fields remain idempotent
    expect(revision).toBe(3);
  });
});
