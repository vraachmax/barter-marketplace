import { slicePageWithBoostCap } from './listing-ranking';

describe('promotion-aware pagination', () => {
  const rows = (flags: boolean[]) =>
    flags.map((boosted, i) => ({
      raw: { id: String(i), boosted },
      finalScore: flags.length - i,
    }));
  const boosted = (raw: { boosted: boolean }) => raw.boosted;

  it('does not repeat organic rows pulled forward on the previous page', () => {
    const input = rows([true, true, false, false, false, false]);
    const first = slicePageWithBoostCap(input, 0, 3, 1, boosted);
    const second = slicePageWithBoostCap(input, 3, 3, 1, boosted);
    expect(first.map((x) => x.raw.id)).toEqual(['0', '2', '3']);
    expect(second.map((x) => x.raw.id)).toEqual(['1', '4', '5']);
  });

  it.each([0, 1, 2, 4])('retains every ID exactly once with cap %s', (cap) => {
    const input = rows(Array.from({ length: 47 }, (_, i) => i % 3 !== 0));
    const pages = Array.from({ length: 12 }, (_, i) =>
      slicePageWithBoostCap(input, i * 4, 4, cap, boosted),
    );
    const ids = pages.flat().map((x) => x.raw.id);
    expect(ids).toHaveLength(47);
    expect(new Set(ids)).toEqual(new Set(input.map((x) => x.raw.id)));
    expect(pages.slice(0, -1).every((page) => page.length === 4)).toBe(true);
    expect(slicePageWithBoostCap(input, 48, 4, cap, boosted)).toEqual([]);
  });

  it('deduplicates before allocating pages', () => {
    const input = rows([false, true, false]);
    input.splice(1, 0, input[0]);
    const ids = [0, 2]
      .flatMap((skip) => slicePageWithBoostCap(input, skip, 2, 1, boosted))
      .map((x) => x.raw.id);
    expect(ids).toEqual(['0', '1', '2']);
  });
});
