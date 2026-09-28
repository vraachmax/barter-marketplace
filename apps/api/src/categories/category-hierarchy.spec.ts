import { categoryDescendantIds, categoryRoot } from './category-hierarchy';

const nodes = [
  { id: 'root', slug: 'auto', parentId: null },
  { id: 'child', slug: 'cars', parentId: 'root' },
  { id: 'grandchild', slug: 'sedans', parentId: 'child' },
  { id: 'other', slug: 'job', parentId: null },
];

describe('category hierarchy', () => {
  it('includes all descendants without leaking siblings into the parent filter', () => {
    expect(categoryDescendantIds('root', nodes)).toEqual(['root', 'child', 'grandchild']);
    expect(categoryDescendantIds('child', nodes)).toEqual(['child', 'grandchild']);
    expect(categoryDescendantIds('other', nodes)).toEqual(['other']);
  });

  it('resolves root policy and fails closed on broken references and cycles', () => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    expect(categoryRoot(nodes[2], byId)?.slug).toBe('auto');
    expect(categoryRoot({ id: 'broken', slug: 'unknown', parentId: 'missing' }, byId)).toBeNull();
    const cycle = new Map([
      ['a', { id: 'a', slug: 'a', parentId: 'b' }],
      ['b', { id: 'b', slug: 'b', parentId: 'a' }],
    ]);
    expect(categoryRoot(cycle.get('a')!, cycle)).toBeNull();
  });
});
