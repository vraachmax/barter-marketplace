import { analyticsDays, analyticsWindow } from './seller-analytics';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

describe('seller analytics', () => {
  it('accepts only bounded supported periods', () => {
    expect(analyticsDays()).toBe(30);
    for (const value of ['7', '30', '90']) expect(analyticsDays(value)).toBe(Number(value));
    for (const value of ['', '-1', '365', '30 OR 1=1', '7.0']) expect(analyticsDays(value)).toBe(0);
  });
  it('buckets the current UTC day and handles year boundaries', () => {
    const range = analyticsWindow(7, new Date('2026-01-02T23:59:59Z'));
    expect(range.start.toISOString()).toBe('2025-12-27T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });
  it('uses the authenticated owner and rejects invalid periods before querying', () => {
    const sellerSummary = jest.fn();
    const controller = new AnalyticsController({ sellerSummary } as any);
    controller.seller({ user: { id: 'owner-a' } }, '7');
    expect(sellerSummary).toHaveBeenCalledWith('owner-a', 7);
    expect(() => controller.seller({ user: { id: 'owner-a' } }, '1000')).toThrow();
    expect(sellerSummary).toHaveBeenCalledTimes(1);
  });
  it('scopes every data source to the owner and fills missing daily observations with zero', async () => {
    const groupBy = jest.fn().mockResolvedValue([{ type: 'VIEW_ITEM', _count: { _all: 3 } }]);
    const findMany = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue([]);
    const service = new AnalyticsService({ userBehaviorEvent: { groupBy }, listing: { findMany }, $queryRaw: query } as any, {} as any);
    const result = await service.sellerSummary('owner-a', 7);
    expect(groupBy.mock.calls[0][0].where.listing).toEqual({ ownerId: 'owner-a' });
    expect(findMany.mock.calls[0][0].where).toEqual({ ownerId: 'owner-a' });
    expect(query.mock.calls[0][1]).toBe('owner-a');
    expect(result.daily).toHaveLength(7);
    expect(result.daily.every(row => row.views === 0)).toBe(true);
    expect(result.totals).toEqual({ views: 3, favorites: 0, messages: 0, clicks: 0 });
    expect(result.capabilities).toEqual({ audience: false, offers: false });
  });
});
