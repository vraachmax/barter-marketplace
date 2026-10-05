import base from './vehiclesdb-car-2026.09.1.json';
import supplement from './ru-car-supplement-2026.10.05.json';
import { carCatalog } from './car-catalog';

describe('RU catalog supplement', () => {
  it('preserves the pinned base and adds traceable parent-scoped identifiers', () => {
    expect(carCatalog.makes.slice(0, base.makes.length)).toEqual(base.makes);
    expect(carCatalog.models.slice(0, base.models.length)).toEqual(base.models);
    expect(carCatalog.makes).toHaveLength(311);
    expect(carCatalog.models).toHaveLength(5465);
    const hosts = new Set(['tank.ru', 'belgee.ru', 'exeed.ru', 'www.geely-motors.com', 'haval.ru', 'moskvich.ru']);
    for (const row of [...supplement.makes, ...supplement.models]) {
      expect(hosts.has(new URL(row.source).hostname)).toBe(true);
      expect(row.source.startsWith('https://')).toBe(true);
    }
    for (const model of supplement.models) {
      expect(model.id.startsWith(`${model.makeId}/`)).toBe(true);
      expect(base.models.some(old => old.id === model.id)).toBe(false);
    }
  });
});
