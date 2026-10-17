/** UTC calendar buckets keep totals and the chart on the same interval. */
export function analyticsWindow(days: number, now = new Date()) {
  const end = new Date(now); end.setUTCHours(0, 0, 0, 0); end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days);
  return { start, end };
}
export function analyticsDays(value?: string): number {
  if (value === undefined) return 30;
  return ['7', '30', '90'].includes(value) ? Number(value) : 0;
}
