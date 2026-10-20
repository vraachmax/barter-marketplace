/**
 * Distinct category illustrations only if an actual listing photo is missing.
 * Real seller-supplied media always has priority; never invent chat entries.
 */
export type ChatThumbListing = {
  title?: string | null;
  category?: { title?: string | null } | null;
} | null | undefined;

const base = '/visual-refresh/premium/categories/';
export function getChatThumbnailFallback(listing: ChatThumbListing): string {
  const q = ((listing?.category?.title ?? '') + ' ' + (listing?.title ?? '')).toLocaleLowerCase('ru-RU');
  if (/экскават|автокран|самосвал|спецтехник|погрузчик|бульдозер|грейдер/.test(q)) return base+'special_equipment.webp';
  if (/квартир|недвиж|дом|участок|гараж|комнат|аренд|коттедж/.test(q)) return base+'realty.webp';
  if (/велосип|тренаж|спорт|фитнес|лыж|гантел/.test(q)) return base+'sports.webp';
  if (/автозапчаст|тормоз|запчаст|шина|диск|колёс/.test(q)) return base+'parts.webp';
  if (/машин|автомобил|авто|toyota|volvo|bmw|mercedes|hyundai|honda/.test(q)) return base+'auto.webp';
  if (/iphone|айфон|samsung|macbook|ноутбук|смартфон|телефон|электроник|планшет|компьют|телевизор|приставк|playstation/.test(q)) return base+'electronics.webp';
  if (/детск|коляск|игрушк|ребен|ребён|малыш/.test(q)) return base+'kids.webp';
  if (/одежд|обув|пальто|куртк|худи|футбол|джинс/.test(q)) return base+'clothes.webp';
  if (/интерьер|мебел|диван|кресло|стол|шкаф/.test(q)) return base+'furniture.webp';
  if (/ламп|декор|посуда|для дома|быт/.test(q)) return base+'home.webp';
  if (/собак|кошк|питом|животн/.test(q)) return base+'pets.webp';
  if (/работ|ваканс|резюме|соискател/.test(q)) return base+'job.webp';
  if (/услуг|мастер|ремонт|строител|сервис/.test(q)) return base+'services.webp';
  if (/фото|камер|объектив|зеркалк/.test(q)) return base+'photo.webp';
  if (/парфюм|косметик|красот/.test(q)) return base+'beauty.webp';
  if (/хобби|коллекци|рыбалк|гитар/.test(q)) return base+'hobby.webp';
  return base+'all.webp';
}
