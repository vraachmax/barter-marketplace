import catalog from './vehiclesdb-car-2026.09.1.json';

describe('pinned VehiclesDB car snapshot', () => {
  it('keeps unique stable identifiers and valid make/model relationships', () => {
    expect(catalog.version).toBe('v2026.09.1');
    expect(catalog.makes).toHaveLength(308);
    expect(catalog.models).toHaveLength(5455);
    const makes = new Set(catalog.makes.map(make => make.id));
    expect(makes.size).toBe(catalog.makes.length);
    expect(new Set(catalog.models.map(model => model.id)).size).toBe(catalog.models.length);
    expect(catalog.models.every(model => makes.has(model.makeId) && model.id.startsWith(`${model.makeId}/`))).toBe(true);
    expect(catalog.models.every(model => /^[a-z0-9][a-z0-9_/-]{0,127}$/.test(model.id))).toBe(true);
  });
});
