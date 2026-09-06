const CATEGORY_ART = [
  ['electronics', /электроник|телефон|компьютер|ноутбук|планшет/i],
  ['home', /для дома|мебель|бытов|посуда|интерьер/i],
  ['clothes', /одежд|обувь|аксессуар|украшени/i],
  ['kids', /дет|игрушк/i],
  ['auto', /авто|мото|транспорт|запчаст/i],
  ['hobby', /хобби|спорт|туризм|музык|коллекци/i],
  ['realty', /недвиж|квартир|земельн|гараж/i],
  ['job', /работа|ваканси|резюме/i],
  ['services', /услуг|ремонт|обучени/i],
] as const;

export function listingPlaceholderArt(categoryTitle = '', categorySlug = ''): string | null {
  const match = CATEGORY_ART.find(([slug]) => slug === categorySlug)
    ?? CATEGORY_ART.find(([, pattern]) => pattern.test(categoryTitle));
  return match ? `/categories/${match[0]}.webp` : null;
}

export function usablePhotoUrls(images?: readonly ({ url?: string | null } | null)[] | null): string[] {
  return [...new Set((images ?? []).map((image) => typeof image?.url === 'string' ? image.url.trim() : '').filter(Boolean))];
}
