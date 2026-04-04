/**
 * Секции и поля характеристик при создании объявления.
 * Ориентиры: Avito (параметры), eBay / Amazon (item specifics), Vinted / FB Marketplace (состояние, доставка).
 */

export type ListingAttrFieldType = 'select' | 'text' | 'number';

export type ListingAttrField = {
  key: string;
  label: string;
  hint?: string;
  type: ListingAttrFieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type ListingAttrSection = {
  id: string;
  title: string;
  subtitle?: string;
  fields: ListingAttrField[];
};

/** Общие блоки для любой категории */
export const LISTING_ATTR_COMMON_SECTIONS: ListingAttrSection[] = [
  {
    id: 'condition_delivery',
    title: 'Состояние и сделка',
    subtitle:
      'Как на Avito и западных площадках (eBay, Facebook Marketplace): покупатель видит это до переписки.',
    fields: [
      {
        key: 'condition',
        label: 'Состояние',
        type: 'select',
        options: [
          { value: 'new', label: 'Новое' },
          { value: 'like_new', label: 'Как новое' },
          { value: 'used_good', label: 'Б/у — хорошее' },
          { value: 'used_fair', label: 'Б/у — есть следы эксплуатации' },
          { value: 'for_parts', label: 'На запчасти / неисправное' },
        ],
      },
      {
        key: 'handover',
        label: 'Передача товара',
        hint: 'Самовывоз / доставка — стандарт для маркетплейсов',
        type: 'select',
        options: [
          { value: 'pickup', label: 'Только самовывоз' },
          { value: 'seller_delivery', label: 'Доставка силами продавца' },
          { value: 'courier_ok', label: 'Курьер или почта по договорённости' },
          { value: 'both', label: 'Любой вариант' },
        ],
      },
      {
        key: 'price_flex',
        label: 'Условия по цене',
        type: 'select',
        options: [
          { value: 'firm', label: 'Цена твёрдая' },
          { value: 'negotiable', label: 'Торг уместен' },
          { value: 'exchange', label: 'Рассмотрю обмен' },
        ],
      },
    ],
  },
];

const AUTO: ListingAttrSection[] = [
  {
    id: 'auto_main',
    title: 'Автомобиль',
    subtitle: 'Год, пробег, топливо — как в фильтрах Avito и западных авто-сайтов',
    fields: [
      { key: 'auto_year', label: 'Год выпуска', type: 'number', placeholder: '2018' },
      { key: 'mileage_km', label: 'Пробег, км', type: 'number', placeholder: '87000' },
      {
        key: 'fuel',
        label: 'Топливо',
        type: 'select',
        options: [
          { value: 'petrol', label: 'Бензин' },
          { value: 'diesel', label: 'Дизель' },
          { value: 'hybrid', label: 'Гибрид' },
          { value: 'electric', label: 'Электро' },
          { value: 'gas', label: 'Газ' },
        ],
      },
      {
        key: 'transmission',
        label: 'Коробка передач',
        type: 'select',
        options: [
          { value: 'manual', label: 'Механика' },
          { value: 'automatic', label: 'Автомат' },
          { value: 'robot', label: 'Робот' },
          { value: 'variator', label: 'Вариатор' },
        ],
      },
      {
        key: 'body_type',
        label: 'Кузов',
        type: 'select',
        options: [
          { value: 'sedan', label: 'Седан' },
          { value: 'hatch', label: 'Хэтчбек' },
          { value: 'wagon', label: 'Универсал' },
          { value: 'suv', label: 'Кроссовер / SUV' },
          { value: 'coupe', label: 'Купе' },
          { value: 'van', label: 'Минивэн' },
          { value: 'pickup', label: 'Пикап' },
        ],
      },
      {
        key: 'drive',
        label: 'Привод',
        type: 'select',
        options: [
          { value: 'fwd', label: 'Передний' },
          { value: 'rwd', label: 'Задний' },
          { value: 'awd', label: 'Полный' },
        ],
      },
      { key: 'color', label: 'Цвет', type: 'text', placeholder: 'Белый металлик' },
    ],
  },
];

const REALTY: ListingAttrSection[] = [
  {
    id: 'realty_main',
    title: 'Недвижимость',
    subtitle: 'Тип сделки и ключевые метры — как в карточках ЦИАН / Zillow',
    fields: [
      {
        key: 'deal_type',
        label: 'Тип сделки',
        type: 'select',
        options: [
          { value: 'sale', label: 'Продажа' },
          { value: 'rent_long', label: 'Аренда от года' },
          { value: 'rent_daily', label: 'Посуточно' },
        ],
      },
      {
        key: 'property_type',
        label: 'Тип объекта',
        type: 'select',
        options: [
          { value: 'flat', label: 'Квартира' },
          { value: 'room', label: 'Комната' },
          { value: 'house', label: 'Дом / дача' },
          { value: 'commercial', label: 'Коммерция' },
          { value: 'land', label: 'Участок' },
        ],
      },
      {
        key: 'rooms',
        label: 'Комнат',
        type: 'select',
        options: [
          { value: 'studio', label: 'Студия' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4plus', label: '4+' },
        ],
      },
      { key: 'area_m2', label: 'Площадь, м²', type: 'number', placeholder: '54' },
      { key: 'floor_info', label: 'Этаж / этажность', type: 'text', placeholder: '5 из 17' },
    ],
  },
];

const JOB: ListingAttrSection[] = [
  {
    id: 'job_main',
    title: 'Вакансия',
    subtitle: 'Формат работы — как на LinkedIn и hh.ru',
    fields: [
      {
        key: 'employment_type',
        label: 'Занятость',
        type: 'select',
        options: [
          { value: 'full', label: 'Полная' },
          { value: 'part', label: 'Частичная' },
          { value: 'project', label: 'Проект / разовая' },
          { value: 'internship', label: 'Стажировка' },
        ],
      },
      {
        key: 'work_format',
        label: 'Формат',
        type: 'select',
        options: [
          { value: 'office', label: 'Офис' },
          { value: 'hybrid', label: 'Гибрид' },
          { value: 'remote', label: 'Удалённо' },
        ],
      },
      {
        key: 'experience_level',
        label: 'Опыт',
        type: 'select',
        options: [
          { value: 'no_matter', label: 'Не важен' },
          { value: 'junior', label: 'Junior' },
          { value: 'middle', label: 'Middle' },
          { value: 'senior', label: 'Senior' },
          { value: 'lead', label: 'Lead / руководитель' },
        ],
      },
      { key: 'salary_hint', label: 'Зарплата в тексте', type: 'text', placeholder: 'от 180 000 ₽ на руки' },
    ],
  },
];

const SERVICES: ListingAttrSection[] = [
  {
    id: 'services_main',
    title: 'Услуга',
    subtitle: 'Где оказываете и опыт — как в профилях Thumbtack / TaskRabbit',
    fields: [
      {
        key: 'service_format',
        label: 'Формат',
        type: 'select',
        options: [
          { value: 'at_client', label: 'Выезд к клиенту' },
          { value: 'remote', label: 'Онлайн / удалённо' },
          { value: 'both', label: 'И выезд, и онлайн' },
        ],
      },
      { key: 'service_sphere', label: 'Сфера', type: 'text', placeholder: 'Ремонт техники, уборка, дизайн…' },
      { key: 'experience_years', label: 'Опыт, лет', type: 'number', placeholder: '5' },
    ],
  },
];

const ELECTRONICS: ListingAttrSection[] = [
  {
    id: 'electronics_main',
    title: 'Электроника',
    subtitle: 'Бренд и модель — как в Amazon / eBay item specifics',
    fields: [
      { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Apple, Samsung…' },
      { key: 'model', label: 'Модель / артикул', type: 'text', placeholder: 'iPhone 14 Pro 256GB' },
      {
        key: 'warranty',
        label: 'Гарантия',
        type: 'select',
        options: [
          { value: 'yes', label: 'Есть' },
          { value: 'no', label: 'Нет' },
          { value: 'unknown', label: 'Не уверен(а)' },
        ],
      },
    ],
  },
];

const HOME: ListingAttrSection[] = [
  {
    id: 'home_main',
    title: 'Для дома и дачи',
    subtitle: 'Материал и габариты — удобно для поиска как на IKEA Marketplace / Etsy',
    fields: [
      {
        key: 'home_item_type',
        label: 'Тип товара',
        type: 'select',
        options: [
          { value: 'furniture', label: 'Мебель' },
          { value: 'appliance', label: 'Техника для дома' },
          { value: 'decor', label: 'Декор' },
          { value: 'garden', label: 'Дача и сад' },
          { value: 'other', label: 'Другое' },
        ],
      },
      { key: 'material', label: 'Материал', type: 'text', placeholder: 'Дуб, МДФ, нержавейка…' },
      { key: 'dimensions', label: 'Габариты', type: 'text', placeholder: '120×60×45 см' },
    ],
  },
];

const CLOTHES: ListingAttrSection[] = [
  {
    id: 'clothes_main',
    title: 'Одежда и обувь',
    subtitle: 'Размер и сезон — логика как у Vinted / Depop',
    fields: [
      { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Zara, Nike…' },
      { key: 'size', label: 'Размер', type: 'text', placeholder: 'M, 42, 27 см…' },
      {
        key: 'gender',
        label: 'Кому',
        type: 'select',
        options: [
          { value: 'women', label: 'Женское' },
          { value: 'men', label: 'Мужское' },
          { value: 'unisex', label: 'Унисекс' },
          { value: 'kids', label: 'Детское' },
        ],
      },
      {
        key: 'season',
        label: 'Сезон',
        type: 'select',
        options: [
          { value: 'demi', label: 'Демисезон' },
          { value: 'winter', label: 'Зима' },
          { value: 'summer', label: 'Лето' },
          { value: 'all', label: 'Всесезонное' },
        ],
      },
    ],
  },
];

const KIDS: ListingAttrSection[] = [
  {
    id: 'kids_main',
    title: 'Детские товары',
    subtitle: 'Возраст и бренд — как в детских разделах Avito / Amazon',
    fields: [
      {
        key: 'age_group',
        label: 'Возраст ребёнка',
        type: 'select',
        options: [
          { value: '0_1', label: '0–1 год' },
          { value: '1_3', label: '1–3 года' },
          { value: '3_7', label: '3–7 лет' },
          { value: '7_12', label: '7–12 лет' },
          { value: '12plus', label: '12+' },
        ],
      },
      { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Lego, Chicco…' },
    ],
  },
];

const HOBBY: ListingAttrSection[] = [
  {
    id: 'hobby_main',
    title: 'Хобби и отдых',
    subtitle: 'Категория интереса — как на eBay Collectibles / Etsy handmade',
    fields: [
      {
        key: 'hobby_type',
        label: 'Направление',
        type: 'select',
        options: [
          { value: 'sport', label: 'Спорт' },
          { value: 'music', label: 'Музыка' },
          { value: 'collectibles', label: 'Коллекционирование' },
          { value: 'games', label: 'Игры' },
          { value: 'outdoor', label: 'Туризм / outdoor' },
          { value: 'other', label: 'Другое' },
        ],
      },
      { key: 'hobby_details', label: 'Уточнение', type: 'text', placeholder: 'Например: гитара акустическая' },
    ],
  },
];

/** Дополнительные секции по slug категории API */
export const LISTING_ATTR_BY_CATEGORY_SLUG: Record<string, ListingAttrSection[]> = {
  auto: AUTO,
  realty: REALTY,
  job: JOB,
  services: SERVICES,
  electronics: ELECTRONICS,
  home: HOME,
  clothes: CLOTHES,
  kids: KIDS,
  hobby: HOBBY,
};

export function getListingAttrSectionsForCategorySlug(slug: string): ListingAttrSection[] {
  const extra = LISTING_ATTR_BY_CATEGORY_SLUG[slug] ?? [];
  return [...LISTING_ATTR_COMMON_SECTIONS, ...extra];
}

export function getListingAttrFieldMeta(key: string): ListingAttrField | undefined {
  for (const s of LISTING_ATTR_COMMON_SECTIONS) {
    const f = s.fields.find((x) => x.key === key);
    if (f) return f;
  }
  for (const sections of Object.values(LISTING_ATTR_BY_CATEGORY_SLUG)) {
    for (const s of sections) {
      const f = s.fields.find((x) => x.key === key);
      if (f) return f;
    }
  }
  return undefined;
}

export function getListingAttrLabel(key: string): string {
  return getListingAttrFieldMeta(key)?.label ?? key.replace(/_/g, ' ');
}

export function formatListingAttributeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : String(value);
  const meta = getListingAttrFieldMeta(key);
  if (meta?.type === 'select' && meta.options) {
    const opt = meta.options.find((o) => o.value === str);
    return opt?.label ?? str;
  }
  return str;
}

/** Собираем JSON для API: только непустые поля, числа как number */
export function serializeListingAttributes(
  sections: ListingAttrSection[],
  values: Record<string, string>,
): Record<string, string | number | boolean> | undefined {
  const out: Record<string, string | number | boolean> = {};
  for (const sec of sections) {
    for (const f of sec.fields) {
      const raw = (values[f.key] ?? '').trim();
      if (!raw) continue;
      if (f.type === 'number') {
        const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
        if (Number.isFinite(n)) out[f.key] = Math.round(n);
      } else {
        out[f.key] = raw;
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
