/** Approved, reusable category illustrations. Never present them as seller photos. */
const ART_BY_SLUG: Record<string, string> = {
  electronics: 'laptops', smartphone: 'smartphones', smartphones: 'smartphones',
  phones: 'smartphones', phone: 'smartphones', laptops: 'laptops',
  computers: 'laptops', gaming: 'gaming', hobby: 'gaming',
  auto: 'cars', cars: 'cars', vehicles: 'cars',
  machinery: 'heavy-machinery', heavy_machinery: 'heavy-machinery',
  special_equipment: 'heavy-machinery', special_equipment_rental: 'heavy-machinery',
  services: 'services', home: 'furniture', furniture: 'furniture',
  clothes: 'clothing', clothing: 'clothing', realty: 'real-estate',
  real_estate: 'real-estate', watches: 'watches', watch: 'watches',
  headphones: 'headphones', accessories: 'watches',
  job: 'miscellaneous', kids: 'miscellaneous',
  other: 'miscellaneous',
};

function illustrationKey(title: string, slug: string) {
  const normalized = slug.toLowerCase().replace(/-/g, '_');
  if (ART_BY_SLUG[normalized]) return ART_BY_SLUG[normalized];
  const value = title.toLowerCase();
  if (/спецтехник|экскаватор|самосвал|автокран|автовышк|погрузчик/.test(value)) return 'heavy-machinery';
  if (/услуг|ремонт|мастер|монтаж|уборк|обучени/.test(value)) return 'services';
  if (/электрон/.test(value)) return 'laptops';
  if (/детск|игрушк|ребёнк/.test(value)) return 'miscellaneous';
  if (/смартфон|телефон|iphone/.test(value)) return 'smartphones';
  if (/ноутбук|macbook|компьютер/.test(value)) return 'laptops';
  if (/приставк|игр|playstation|xbox/.test(value)) return 'gaming';
  if (/час|watch/.test(value)) return 'watches';
  if (/наушник|airpods/.test(value)) return 'headphones';
  if (/авто|машин|транспорт|мото/.test(value)) return 'cars';
  if (/мебел|диван|кресл|для дома/.test(value)) return 'furniture';
  if (/одежд|обув|куртк/.test(value)) return 'clothing';
  if (/недвиж|квартир|дом|земл|гараж/.test(value)) return 'real-estate';
  return 'miscellaneous';
}
export function listingPlaceholderArt(categoryTitle = '', categorySlug = ''): string {
  return `/visual-refresh/placeholders/${illustrationKey(categoryTitle, categorySlug)}.webp`;
}
export function usablePhotoUrls(images?: readonly ({ url?: string | null } | null)[] | null): string[] {
  return [...new Set((images ?? []).map((image) => typeof image?.url === 'string' ? image.url.trim() : '').filter(Boolean))];
}
