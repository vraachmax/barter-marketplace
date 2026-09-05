import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  LISTING_SORTS,
  ListListingsQueryDto,
  normalizeListingsQuery,
} from './list-listings-query.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
async function parse(raw: Record<string, unknown>) {
  const dto: unknown = await pipe.transform(raw, {
    type: 'query',
    metatype: ListListingsQueryDto,
  });
  if (!(dto instanceof ListListingsQueryDto)) {
    throw new Error('ValidationPipe must return a transformed query DTO');
  }
  return normalizeListingsQuery(dto);
}

describe('listing search contract', () => {
  it('uses stable defaults', async () => {
    await expect(parse({})).resolves.toEqual({
      page: 1,
      limit: 20,
      sort: 'relevant',
    });
  });
  it('treats empty form inputs as absent and preserves zero', async () => {
    await expect(
      parse({
        city: ' ',
        q: '',
        page: '',
        limit: '',
        priceMin: '0',
        priceMax: '',
      }),
    ).resolves.toMatchObject({
      city: undefined,
      q: undefined,
      page: 1,
      limit: 20,
      priceMin: 0,
      priceMax: undefined,
    });
  });
  it('normalizes whitespace/Unicode without changing model identifiers', async () => {
    await expect(
      parse({
        q: '  iPhone　１４ Pro  256 ГБ  ',
        city: '  Нижний   Новгород  ',
      }),
    ).resolves.toMatchObject({
      q: 'iPhone 14 Pro 256 ГБ',
      city: 'Нижний Новгород',
    });
  });
  it.each(['айфно 14', 'fqajy 15', 'PS5', 'iPhone 14 128 ГБ', 'кран 80 т'])(
    'preserves query intent for later correction: %s',
    async (q) => {
      await expect(parse({ q })).resolves.toMatchObject({ q });
    },
  );
  it.each(LISTING_SORTS)('preserves explicit sorting: %s', async (sort) => {
    await expect(parse({ sort, lat: '0', lon: '0' })).resolves.toMatchObject({
      sort,
      lat: 0,
      lon: 0,
    });
  });
  it('keeps all filters and page together', async () => {
    await expect(
      parse({
        q: 'велосипед',
        city: 'Краснодар',
        categoryId: 'category-1',
        priceMin: '1000',
        priceMax: '5000',
        sort: 'cheap',
        page: '2',
        limit: '20',
      }),
    ).resolves.toEqual({
      q: 'велосипед',
      city: 'Краснодар',
      categoryId: 'category-1',
      priceMin: 1000,
      priceMax: 5000,
      sort: 'cheap',
      page: 2,
      limit: 20,
    });
  });
  it('accepts finite decimal WGS84 coordinates and boundaries', async () => {
    await expect(
      parse({
        lat: '-90',
        lon: '180',
        radiusKm: '500',
        page: '10000',
        limit: '50',
        priceMax: '2147483647',
      }),
    ).resolves.toMatchObject({
      lat: -90,
      lon: 180,
      radiusKm: 500,
      page: 10000,
      limit: 50,
    });
    await expect(
      parse({ lat: '45.03547', lon: '38.97531' }),
    ).resolves.toMatchObject({ lat: 45.03547, lon: 38.97531 });
  });
  it.each([
    ['priceMin', '-1'],
    ['priceMax', '1.5'],
    ['priceMax', '2147483648'],
    ['priceMin', 'NaN'],
    ['priceMax', 'Infinity'],
    ['priceMin', '0x10'],
    ['priceMax', '1e5'],
    ['page', '0'],
    ['page', '-1'],
    ['page', '1.5'],
    ['page', 'NaN'],
    ['page', '10001'],
    ['limit', '0'],
    ['limit', '51'],
    ['limit', 'Infinity'],
    ['lat', '91'],
    ['lat', '-91'],
    ['lon', '181'],
    ['lon', '-181'],
    ['radiusKm', '0'],
    ['radiusKm', '501'],
    ['sort', 'random'],
    ['q', 'a'.repeat(201)],
    ['city', 'a'.repeat(81)],
    ['categoryId', 'a'.repeat(129)],
    ['priceMin', ['10', '20']],
    ['q', ['iPhone', 'Samsung']],
    ['sort', { order: 'new' }],
    ['unrecognizedFilter', 'value'],
  ])('rejects malformed/out-of-range %s (%j)', async (field, value) => {
    await expect(parse({ [String(field)]: value })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('rejects reversed prices rather than swapping bounds silently', async () => {
    try {
      await parse({ priceMin: '5000', priceMax: '1000' });
      throw new Error('expected400');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: 'invalid_price_range',
        field: 'priceMax',
      });
    }
  });
  it.each([
    { lat: '45' },
    { lon: '39' },
    { radiusKm: '25' },
    { sort: 'nearby' },
  ])('requires a complete coordinate pair: %j', async (raw) => {
    await expect(parse(raw)).rejects.toBeInstanceOf(BadRequestException);
  });
});
