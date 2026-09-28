import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CategoryNode = { id: string; slug: string; parentId?: string | null };

/** The root owns shared rules; a malformed cycle must never grant barter. */
export function categoryRoot(category: CategoryNode, byId: Map<string, CategoryNode>): CategoryNode | null {
  const seen = new Set<string>();
  let node: CategoryNode | undefined = category;
  while (node) {
    if (seen.has(node.id)) return null;
    seen.add(node.id);
    if (!node.parentId) return node;
    node = byId.get(node.parentId);
  }
  return null;
}

export function categoryDescendantIds(categoryId: string, nodes: CategoryNode[]): string[] {
  const result = new Set([categoryId]);
  let previousSize = 0;
  while (result.size !== previousSize) {
    previousSize = result.size;
    for (const node of nodes) if (node.parentId && result.has(node.parentId)) result.add(node.id);
  }
  return [...result];
}

export async function categoryLineage(prisma: PrismaService, categoryId: string) {
  const seen = new Set<string>();
  const lineage: Array<{ id: string; slug: string; parentId: string | null }> = [];
  let id: string | null = categoryId;
  while (id) {
    if (seen.has(id) || lineage.length >= 32) throw new BadRequestException('invalid_category_hierarchy');
    seen.add(id);
    const node: { id: string; slug: string; parentId: string | null } | null = await prisma.category.findUnique({
      where: { id }, select: { id: true, slug: true, parentId: true },
    });
    if (!node) throw new BadRequestException('invalid_category_hierarchy');
    lineage.push(node);
    id = node.parentId;
  }
  return lineage;
}

/** Until child-specific schema overrides are introduced, the closest ancestor with fields owns the catalog. */
export async function catalogOwnerId(prisma: PrismaService, categoryId: string): Promise<string> {
  const lineage = await categoryLineage(prisma, categoryId);
  for (const node of lineage) {
    const field = await prisma.categoryAttributeField.findFirst({ where: { categoryId: node.id, isActive: true }, select: { id: true } });
    if (field) return node.id;
  }
  return categoryId;
}
