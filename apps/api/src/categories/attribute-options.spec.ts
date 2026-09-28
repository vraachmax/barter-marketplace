import { invalidCatalogOption } from './attribute-options';

describe('catalog attribute choices', () => {
  const options = [
    { fieldKey: 'fuel', value: 'petrol' },
    { fieldKey: 'fuel', value: 'electric' },
    { fieldKey: 'drive', value: 'awd' },
  ];

  it('accepts one of the stored choices and independent descriptive fields', () => {
    expect(invalidCatalogOption({ fuel: 'electric', drive: 'awd', mileage_km: 5000 }, options)).toBeNull();
  });

  it('rejects a made-up value or wrong field type', () => {
    expect(invalidCatalogOption({ fuel: 'steam' }, options)).toBe('fuel');
    expect(invalidCatalogOption({ drive: 1 }, options)).toBe('drive');
  });

  it('requires the selected parent option for a dependent model', () => {
    const hierarchy = [
      { fieldKey: 'auto_make', value: 'bmw' },
      { fieldKey: 'auto_make', value: 'lada' },
      { fieldKey: 'auto_model', value: '3-series', parentFieldKey: 'auto_make', parentValue: 'bmw' },
    ];
    expect(invalidCatalogOption({ auto_make: 'bmw', auto_model: '3-series' }, hierarchy)).toBeNull();
    expect(invalidCatalogOption({ auto_make: 'lada', auto_model: '3-series' }, hierarchy)).toBe('auto_model');
    expect(invalidCatalogOption({ auto_model: '3-series' }, hierarchy)).toBe('auto_model');
  });
});
