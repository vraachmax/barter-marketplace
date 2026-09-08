import { searchEligibility } from './search-eligibility';

describe('protected search candidates', () => {
  it.each([
    ['iphone 14', 'iPhone 140', false],
    ['iphone 14', 'iPhone 14 Pro', true],
    ['samsung s24', 'Samsung S240', false],
    ['samsung s24', 'Samsung S24', true],
    ['ps5', 'Sony PS50', false],
    ['пс5', 'Sony PS5', true],
    ['macbook m2', 'MacBook M20', false],
    ['автокран 80', 'Автокран 800 тонн', false],
    ['шины 205 55 r16', 'Шины 205/55 R16', true],
    ['шины 205 55 r16', 'Шины 205/55 R160', false],
    ['iphone 14', 'Чехол для iPhone 14', false],
    ['iphone 14', 'Новый силиконовый чехол для iPhone 14', false],
    ['iphone 14', 'Защитное стекло для iPhone 14', false],
    ['чехол iphone 14', 'Чехол для iPhone 14', true],
    ['iphone 14', 'iPhone 14 с чехлом', true],
    ['iphone 14', 'iPhone 14 без чехла', true],
    ['', 'Чехол для iPhone 14', true],
    ['автокран', 'Автокран 800 тонн', true],
  ])('%s / %s -> %s', (query, title, expected) => {
    expect(searchEligibility(query)({ title })).toBe(expected);
  });

  it('can find a protected model in the description', () => {
    expect(
      searchEligibility('samsung s24')({
        title: 'Samsung',
        description: 'Модель S24, 256 ГБ',
      }),
    ).toBe(true);
  });
});
