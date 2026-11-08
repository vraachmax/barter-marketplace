/** Versioned append-only taxonomy. Never rename published slugs or delete user categories. */
export const MARKETPLACE_CATALOG_REVISION = 5;
export type CategorySeed = { slug:string; title:string; parent:string };
export const MARKETPLACE_CATEGORY_TREE: readonly CategorySeed[] = [
  {
    "slug": "passenger-cars",
    "title": "Легковые автомобили",
    "parent": "auto"
  },
  {
    "slug": "passenger-cars-sedans",
    "title": "Седаны",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-crossovers",
    "title": "Кроссоверы и внедорожники",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-hatchbacks",
    "title": "Хэтчбеки",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-wagons",
    "title": "Универсалы",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-minivans",
    "title": "Минивэны",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-coupe",
    "title": "Купе и кабриолеты",
    "parent": "passenger-cars"
  },
  {
    "slug": "passenger-cars-electric-cars",
    "title": "Электромобили",
    "parent": "passenger-cars"
  },
  {
    "slug": "auto-motorcycles",
    "title": "Мотоциклы",
    "parent": "auto"
  },
  {
    "slug": "auto-motorcycles-street-bikes",
    "title": "Дорожные",
    "parent": "auto-motorcycles"
  },
  {
    "slug": "auto-motorcycles-sport-bikes",
    "title": "Спортбайки",
    "parent": "auto-motorcycles"
  },
  {
    "slug": "auto-motorcycles-enduro",
    "title": "Эндуро и кросс",
    "parent": "auto-motorcycles"
  },
  {
    "slug": "auto-motorcycles-scooters",
    "title": "Скутеры и мопеды",
    "parent": "auto-motorcycles"
  },
  {
    "slug": "auto-commercial-vehicles",
    "title": "Коммерческий транспорт",
    "parent": "auto"
  },
  {
    "slug": "auto-commercial-vehicles-vans",
    "title": "Фургоны",
    "parent": "auto-commercial-vehicles"
  },
  {
    "slug": "auto-commercial-vehicles-trucks",
    "title": "Грузовики",
    "parent": "auto-commercial-vehicles"
  },
  {
    "slug": "auto-commercial-vehicles-buses",
    "title": "Автобусы",
    "parent": "auto-commercial-vehicles"
  },
  {
    "slug": "auto-special-equipment",
    "title": "Спецтехника",
    "parent": "auto"
  },
  {
    "slug": "auto-special-equipment-excavators",
    "title": "Экскаваторы",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-special-equipment-cranes",
    "title": "Краны",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-special-equipment-loaders",
    "title": "Погрузчики",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-special-equipment-bulldozers",
    "title": "Бульдозеры",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-special-equipment-dump-trucks",
    "title": "Самосвалы",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-special-equipment-trailers",
    "title": "Тралы и прицепы",
    "parent": "auto-special-equipment"
  },
  {
    "slug": "auto-auto-parts",
    "title": "Запчасти и аксессуары",
    "parent": "auto"
  },
  {
    "slug": "auto-auto-parts-wheels",
    "title": "Колёса",
    "parent": "auto-auto-parts"
  },
  {
    "slug": "auto-auto-parts-tires",
    "title": "Шины",
    "parent": "auto-auto-parts"
  },
  {
    "slug": "auto-auto-parts-auto-electronics",
    "title": "Автоэлектроника",
    "parent": "auto-auto-parts"
  },
  {
    "slug": "auto-auto-parts-engine-parts",
    "title": "Двигатели и детали",
    "parent": "auto-auto-parts"
  },
  {
    "slug": "auto-auto-parts-body-parts",
    "title": "Кузовные детали",
    "parent": "auto-auto-parts"
  },
  {
    "slug": "realty-apartments",
    "title": "Квартиры",
    "parent": "realty"
  },
  {
    "slug": "realty-apartments-studios",
    "title": "Студии",
    "parent": "realty-apartments"
  },
  {
    "slug": "realty-apartments-one-room",
    "title": "Однокомнатные",
    "parent": "realty-apartments"
  },
  {
    "slug": "realty-apartments-two-room",
    "title": "Двухкомнатные",
    "parent": "realty-apartments"
  },
  {
    "slug": "realty-apartments-three-room",
    "title": "Трёхкомнатные",
    "parent": "realty-apartments"
  },
  {
    "slug": "realty-apartments-four-plus",
    "title": "Четыре и более комнат",
    "parent": "realty-apartments"
  },
  {
    "slug": "realty-houses",
    "title": "Дома и дачи",
    "parent": "realty"
  },
  {
    "slug": "realty-houses-detached",
    "title": "Частные дома",
    "parent": "realty-houses"
  },
  {
    "slug": "realty-houses-townhouses",
    "title": "Таунхаусы",
    "parent": "realty-houses"
  },
  {
    "slug": "realty-houses-cottages",
    "title": "Коттеджи",
    "parent": "realty-houses"
  },
  {
    "slug": "realty-houses-summer-houses",
    "title": "Дачи",
    "parent": "realty-houses"
  },
  {
    "slug": "realty-land",
    "title": "Земельные участки",
    "parent": "realty"
  },
  {
    "slug": "realty-land-residential-land",
    "title": "ИЖС",
    "parent": "realty-land"
  },
  {
    "slug": "realty-land-garden-land",
    "title": "СНТ",
    "parent": "realty-land"
  },
  {
    "slug": "realty-land-commercial-land",
    "title": "Коммерческие участки",
    "parent": "realty-land"
  },
  {
    "slug": "realty-commercial-realty",
    "title": "Коммерческая недвижимость",
    "parent": "realty"
  },
  {
    "slug": "realty-commercial-realty-offices",
    "title": "Офисы",
    "parent": "realty-commercial-realty"
  },
  {
    "slug": "realty-commercial-realty-retail",
    "title": "Торговые помещения",
    "parent": "realty-commercial-realty"
  },
  {
    "slug": "realty-commercial-realty-warehouses",
    "title": "Склады",
    "parent": "realty-commercial-realty"
  },
  {
    "slug": "realty-commercial-realty-industrial",
    "title": "Производство",
    "parent": "realty-commercial-realty"
  },
  {
    "slug": "realty-parking",
    "title": "Гаражи и машиноместа",
    "parent": "realty"
  },
  {
    "slug": "realty-parking-garages",
    "title": "Гаражи",
    "parent": "realty-parking"
  },
  {
    "slug": "realty-parking-parking-spaces",
    "title": "Машиноместа",
    "parent": "realty-parking"
  },
  {
    "slug": "electronics-phones",
    "title": "Телефоны и связь",
    "parent": "electronics"
  },
  {
    "slug": "electronics-phones-smartphones",
    "title": "Смартфоны",
    "parent": "electronics-phones"
  },
  {
    "slug": "electronics-phones-button-phones",
    "title": "Кнопочные телефоны",
    "parent": "electronics-phones"
  },
  {
    "slug": "electronics-phones-phone-accessories",
    "title": "Аксессуары для телефонов",
    "parent": "electronics-phones"
  },
  {
    "slug": "electronics-phones-smartwatches",
    "title": "Смарт-часы",
    "parent": "electronics-phones"
  },
  {
    "slug": "electronics-computers",
    "title": "Компьютеры",
    "parent": "electronics"
  },
  {
    "slug": "electronics-computers-laptops",
    "title": "Ноутбуки",
    "parent": "electronics-computers"
  },
  {
    "slug": "electronics-computers-desktops",
    "title": "Системные блоки",
    "parent": "electronics-computers"
  },
  {
    "slug": "electronics-computers-monitors",
    "title": "Мониторы",
    "parent": "electronics-computers"
  },
  {
    "slug": "electronics-computers-components",
    "title": "Комплектующие",
    "parent": "electronics-computers"
  },
  {
    "slug": "electronics-computers-keyboards",
    "title": "Клавиатуры и мыши",
    "parent": "electronics-computers"
  },
  {
    "slug": "electronics-tablets",
    "title": "Планшеты и электронные книги",
    "parent": "electronics"
  },
  {
    "slug": "electronics-tablets-tablet-devices",
    "title": "Планшеты",
    "parent": "electronics-tablets"
  },
  {
    "slug": "electronics-tablets-e-readers",
    "title": "Электронные книги",
    "parent": "electronics-tablets"
  },
  {
    "slug": "electronics-photo-video",
    "title": "Фото и видео",
    "parent": "electronics"
  },
  {
    "slug": "electronics-photo-video-cameras",
    "title": "Фотокамеры",
    "parent": "electronics-photo-video"
  },
  {
    "slug": "electronics-photo-video-lenses",
    "title": "Объективы",
    "parent": "electronics-photo-video"
  },
  {
    "slug": "electronics-photo-video-action-cameras",
    "title": "Экшн-камеры",
    "parent": "electronics-photo-video"
  },
  {
    "slug": "electronics-photo-video-drones",
    "title": "Квадрокоптеры",
    "parent": "electronics-photo-video"
  },
  {
    "slug": "electronics-tv-audio",
    "title": "ТВ и аудио",
    "parent": "electronics"
  },
  {
    "slug": "electronics-tv-audio-televisions",
    "title": "Телевизоры",
    "parent": "electronics-tv-audio"
  },
  {
    "slug": "electronics-tv-audio-headphones",
    "title": "Наушники",
    "parent": "electronics-tv-audio"
  },
  {
    "slug": "electronics-tv-audio-speakers",
    "title": "Акустика",
    "parent": "electronics-tv-audio"
  },
  {
    "slug": "electronics-tv-audio-projectors",
    "title": "Проекторы",
    "parent": "electronics-tv-audio"
  },
  {
    "slug": "electronics-gaming",
    "title": "Игры и приставки",
    "parent": "electronics"
  },
  {
    "slug": "electronics-gaming-consoles",
    "title": "Приставки",
    "parent": "electronics-gaming"
  },
  {
    "slug": "electronics-gaming-gamepads",
    "title": "Геймпады",
    "parent": "electronics-gaming"
  },
  {
    "slug": "electronics-gaming-video-games",
    "title": "Видеоигры",
    "parent": "electronics-gaming"
  },
  {
    "slug": "electronics-appliances",
    "title": "Бытовая техника",
    "parent": "electronics"
  },
  {
    "slug": "electronics-appliances-refrigerators",
    "title": "Холодильники",
    "parent": "electronics-appliances"
  },
  {
    "slug": "electronics-appliances-washing-machines",
    "title": "Стиральные машины",
    "parent": "electronics-appliances"
  },
  {
    "slug": "electronics-appliances-vacuum-cleaners",
    "title": "Пылесосы",
    "parent": "electronics-appliances"
  },
  {
    "slug": "electronics-appliances-coffee-machines",
    "title": "Кофемашины",
    "parent": "electronics-appliances"
  },
  {
    "slug": "electronics-appliances-kitchen-appliances",
    "title": "Кухонная техника",
    "parent": "electronics-appliances"
  },
  {
    "slug": "electronics-appliances-air-conditioners",
    "title": "Кондиционеры",
    "parent": "electronics-appliances"
  },
  {
    "slug": "home-furniture",
    "title": "Мебель",
    "parent": "home"
  },
  {
    "slug": "home-furniture-sofas",
    "title": "Диваны",
    "parent": "home-furniture"
  },
  {
    "slug": "home-furniture-beds",
    "title": "Кровати",
    "parent": "home-furniture"
  },
  {
    "slug": "home-furniture-cabinets",
    "title": "Шкафы",
    "parent": "home-furniture"
  },
  {
    "slug": "home-furniture-tables",
    "title": "Столы",
    "parent": "home-furniture"
  },
  {
    "slug": "home-furniture-chairs",
    "title": "Стулья",
    "parent": "home-furniture"
  },
  {
    "slug": "home-household",
    "title": "Товары для дома",
    "parent": "home"
  },
  {
    "slug": "home-household-lighting",
    "title": "Освещение",
    "parent": "home-household"
  },
  {
    "slug": "home-household-dishes",
    "title": "Посуда",
    "parent": "home-household"
  },
  {
    "slug": "home-household-textiles",
    "title": "Текстиль",
    "parent": "home-household"
  },
  {
    "slug": "home-household-decor",
    "title": "Декор",
    "parent": "home-household"
  },
  {
    "slug": "home-tools",
    "title": "Инструменты",
    "parent": "home"
  },
  {
    "slug": "home-tools-power-tools",
    "title": "Электроинструмент",
    "parent": "home-tools"
  },
  {
    "slug": "home-tools-hand-tools",
    "title": "Ручной инструмент",
    "parent": "home-tools"
  },
  {
    "slug": "home-tools-garden-tools",
    "title": "Садовый инструмент",
    "parent": "home-tools"
  },
  {
    "slug": "home-building-materials",
    "title": "Стройматериалы",
    "parent": "home"
  },
  {
    "slug": "home-building-materials-lumber",
    "title": "Пиломатериалы",
    "parent": "home-building-materials"
  },
  {
    "slug": "home-building-materials-metal",
    "title": "Металл и конструкции",
    "parent": "home-building-materials"
  },
  {
    "slug": "home-building-materials-finishing",
    "title": "Отделочные материалы",
    "parent": "home-building-materials"
  },
  {
    "slug": "home-building-materials-plumbing",
    "title": "Сантехника",
    "parent": "home-building-materials"
  },
  {
    "slug": "clothes-mens-clothes",
    "title": "Мужская одежда",
    "parent": "clothes"
  },
  {
    "slug": "clothes-mens-clothes-outerwear",
    "title": "Верхняя одежда",
    "parent": "clothes-mens-clothes"
  },
  {
    "slug": "clothes-mens-clothes-suits",
    "title": "Костюмы",
    "parent": "clothes-mens-clothes"
  },
  {
    "slug": "clothes-mens-clothes-shirts",
    "title": "Рубашки",
    "parent": "clothes-mens-clothes"
  },
  {
    "slug": "clothes-mens-clothes-jeans",
    "title": "Джинсы",
    "parent": "clothes-mens-clothes"
  },
  {
    "slug": "clothes-womens-clothes",
    "title": "Женская одежда",
    "parent": "clothes"
  },
  {
    "slug": "clothes-womens-clothes-dresses",
    "title": "Платья",
    "parent": "clothes-womens-clothes"
  },
  {
    "slug": "clothes-womens-clothes-outerwear",
    "title": "Верхняя одежда",
    "parent": "clothes-womens-clothes"
  },
  {
    "slug": "clothes-womens-clothes-suits",
    "title": "Костюмы",
    "parent": "clothes-womens-clothes"
  },
  {
    "slug": "clothes-womens-clothes-skirts",
    "title": "Юбки",
    "parent": "clothes-womens-clothes"
  },
  {
    "slug": "clothes-footwear",
    "title": "Обувь",
    "parent": "clothes"
  },
  {
    "slug": "clothes-footwear-sneakers",
    "title": "Кроссовки",
    "parent": "clothes-footwear"
  },
  {
    "slug": "clothes-footwear-boots",
    "title": "Ботинки",
    "parent": "clothes-footwear"
  },
  {
    "slug": "clothes-footwear-shoes",
    "title": "Туфли",
    "parent": "clothes-footwear"
  },
  {
    "slug": "clothes-footwear-sandals",
    "title": "Сандалии",
    "parent": "clothes-footwear"
  },
  {
    "slug": "clothes-accessories",
    "title": "Аксессуары",
    "parent": "clothes"
  },
  {
    "slug": "clothes-accessories-bags",
    "title": "Сумки",
    "parent": "clothes-accessories"
  },
  {
    "slug": "clothes-accessories-watches",
    "title": "Часы",
    "parent": "clothes-accessories"
  },
  {
    "slug": "clothes-accessories-jewelry",
    "title": "Украшения",
    "parent": "clothes-accessories"
  },
  {
    "slug": "clothes-accessories-eyewear",
    "title": "Очки",
    "parent": "clothes-accessories"
  },
  {
    "slug": "kids-kids-transport",
    "title": "Коляски и транспорт",
    "parent": "kids"
  },
  {
    "slug": "kids-kids-transport-strollers",
    "title": "Коляски",
    "parent": "kids-kids-transport"
  },
  {
    "slug": "kids-kids-transport-car-seats",
    "title": "Автокресла",
    "parent": "kids-kids-transport"
  },
  {
    "slug": "kids-kids-transport-kids-bikes",
    "title": "Детские велосипеды",
    "parent": "kids-kids-transport"
  },
  {
    "slug": "kids-kids-transport-scooters",
    "title": "Самокаты",
    "parent": "kids-kids-transport"
  },
  {
    "slug": "kids-toys",
    "title": "Игрушки",
    "parent": "kids"
  },
  {
    "slug": "kids-toys-construction-toys",
    "title": "Конструкторы",
    "parent": "kids-toys"
  },
  {
    "slug": "kids-toys-dolls",
    "title": "Куклы",
    "parent": "kids-toys"
  },
  {
    "slug": "kids-toys-board-games",
    "title": "Настольные игры",
    "parent": "kids-toys"
  },
  {
    "slug": "kids-kids-clothes",
    "title": "Одежда для детей",
    "parent": "kids"
  },
  {
    "slug": "kids-kids-clothes-newborn",
    "title": "Новорождённые",
    "parent": "kids-kids-clothes"
  },
  {
    "slug": "kids-kids-clothes-school",
    "title": "Школьная форма",
    "parent": "kids-kids-clothes"
  },
  {
    "slug": "kids-kids-clothes-kids-shoes",
    "title": "Детская обувь",
    "parent": "kids-kids-clothes"
  },
  {
    "slug": "kids-kids-furniture",
    "title": "Детская мебель",
    "parent": "kids"
  },
  {
    "slug": "kids-kids-furniture-cribs",
    "title": "Кроватки",
    "parent": "kids-kids-furniture"
  },
  {
    "slug": "kids-kids-furniture-high-chairs",
    "title": "Стульчики для кормления",
    "parent": "kids-kids-furniture"
  },
  {
    "slug": "kids-kids-furniture-desks",
    "title": "Парты",
    "parent": "kids-kids-furniture"
  },
  {
    "slug": "hobby-sports",
    "title": "Спорт и отдых",
    "parent": "hobby"
  },
  {
    "slug": "hobby-sports-bicycles",
    "title": "Велосипеды",
    "parent": "hobby-sports"
  },
  {
    "slug": "hobby-sports-fitness",
    "title": "Фитнес",
    "parent": "hobby-sports"
  },
  {
    "slug": "hobby-sports-camping",
    "title": "Туризм",
    "parent": "hobby-sports"
  },
  {
    "slug": "hobby-sports-winter-sports",
    "title": "Зимний спорт",
    "parent": "hobby-sports"
  },
  {
    "slug": "hobby-music",
    "title": "Музыка",
    "parent": "hobby"
  },
  {
    "slug": "hobby-music-guitars",
    "title": "Гитары",
    "parent": "hobby-music"
  },
  {
    "slug": "hobby-music-keyboards",
    "title": "Клавишные",
    "parent": "hobby-music"
  },
  {
    "slug": "hobby-music-drums",
    "title": "Ударные",
    "parent": "hobby-music"
  },
  {
    "slug": "hobby-collectibles",
    "title": "Коллекционирование",
    "parent": "hobby"
  },
  {
    "slug": "hobby-collectibles-coins",
    "title": "Монеты",
    "parent": "hobby-collectibles"
  },
  {
    "slug": "hobby-collectibles-stamps",
    "title": "Марки",
    "parent": "hobby-collectibles"
  },
  {
    "slug": "hobby-collectibles-antiques",
    "title": "Антиквариат",
    "parent": "hobby-collectibles"
  },
  {
    "slug": "hobby-books",
    "title": "Книги и обучение",
    "parent": "hobby"
  },
  {
    "slug": "hobby-books-fiction",
    "title": "Художественная литература",
    "parent": "hobby-books"
  },
  {
    "slug": "hobby-books-textbooks",
    "title": "Учебники",
    "parent": "hobby-books"
  },
  {
    "slug": "hobby-pets",
    "title": "Товары для животных",
    "parent": "hobby"
  },
  {
    "slug": "hobby-pets-pet-houses",
    "title": "Домики и лежанки",
    "parent": "hobby-pets"
  },
  {
    "slug": "hobby-pets-pet-equipment",
    "title": "Амуниция",
    "parent": "hobby-pets"
  },
  {
    "slug": "hobby-pets-aquariums",
    "title": "Аквариумы",
    "parent": "hobby-pets"
  },
  {
    "slug": "services-construction",
    "title": "Строительство и ремонт",
    "parent": "services"
  },
  {
    "slug": "services-construction-renovation",
    "title": "Ремонт",
    "parent": "services-construction"
  },
  {
    "slug": "services-construction-electricians",
    "title": "Электрика",
    "parent": "services-construction"
  },
  {
    "slug": "services-construction-plumbing-work",
    "title": "Сантехника",
    "parent": "services-construction"
  },
  {
    "slug": "services-construction-earthworks",
    "title": "Земляные работы",
    "parent": "services-construction"
  },
  {
    "slug": "services-equipment-rental",
    "title": "Аренда спецтехники",
    "parent": "services"
  },
  {
    "slug": "services-equipment-rental-crane-rental",
    "title": "Автокраны",
    "parent": "services-equipment-rental"
  },
  {
    "slug": "services-equipment-rental-excavator-rental",
    "title": "Экскаваторы",
    "parent": "services-equipment-rental"
  },
  {
    "slug": "services-equipment-rental-truck-rental",
    "title": "Самосвалы",
    "parent": "services-equipment-rental"
  },
  {
    "slug": "services-equipment-rental-loader-rental",
    "title": "Погрузчики",
    "parent": "services-equipment-rental"
  },
  {
    "slug": "services-delivery",
    "title": "Перевозки",
    "parent": "services"
  },
  {
    "slug": "services-delivery-freight",
    "title": "Грузоперевозки",
    "parent": "services-delivery"
  },
  {
    "slug": "services-delivery-moving",
    "title": "Переезды",
    "parent": "services-delivery"
  },
  {
    "slug": "services-delivery-courier",
    "title": "Курьеры",
    "parent": "services-delivery"
  },
  {
    "slug": "services-education",
    "title": "Обучение",
    "parent": "services"
  },
  {
    "slug": "services-education-tutors",
    "title": "Репетиторы",
    "parent": "services-education"
  },
  {
    "slug": "services-education-languages",
    "title": "Языки",
    "parent": "services-education"
  },
  {
    "slug": "services-education-driving-school",
    "title": "Вождение",
    "parent": "services-education"
  },
  {
    "slug": "services-it",
    "title": "IT и дизайн",
    "parent": "services"
  },
  {
    "slug": "services-it-web-development",
    "title": "Разработка сайтов",
    "parent": "services-it"
  },
  {
    "slug": "services-it-design",
    "title": "Дизайн",
    "parent": "services-it"
  },
  {
    "slug": "services-it-device-repair",
    "title": "Ремонт техники",
    "parent": "services-it"
  },
  {
    "slug": "services-beauty",
    "title": "Красота и здоровье",
    "parent": "services"
  },
  {
    "slug": "services-beauty-hair",
    "title": "Парикмахерские",
    "parent": "services-beauty"
  },
  {
    "slug": "services-beauty-cosmetics",
    "title": "Косметология",
    "parent": "services-beauty"
  },
  {
    "slug": "services-beauty-massage",
    "title": "Массаж",
    "parent": "services-beauty"
  },
  {
    "slug": "job-vacancies",
    "title": "Вакансии",
    "parent": "job"
  },
  {
    "slug": "job-vacancies-drivers",
    "title": "Водители",
    "parent": "job-vacancies"
  },
  {
    "slug": "job-vacancies-construction-jobs",
    "title": "Строительство",
    "parent": "job-vacancies"
  },
  {
    "slug": "job-vacancies-office-jobs",
    "title": "Офис",
    "parent": "job-vacancies"
  },
  {
    "slug": "job-vacancies-remote-jobs",
    "title": "Удалённая работа",
    "parent": "job-vacancies"
  },
  {
    "slug": "job-resumes",
    "title": "Резюме",
    "parent": "job"
  },
  {
    "slug": "job-resumes-work-experience",
    "title": "С опытом",
    "parent": "job-resumes"
  },
  {
    "slug": "job-resumes-first-job",
    "title": "Без опыта",
    "parent": "job-resumes"
  }
] as const;
export const MARKETPLACE_REQUIRED_ROOTS = ["auto","realty","electronics","home","clothes","kids","hobby","services","job"] as const;
export function validateCategorySeed(tree:readonly CategorySeed[]):void {
 const seen=new Set<string>(MARKETPLACE_REQUIRED_ROOTS);
 for(const row of tree) {
   if(seen.has(row.slug)) throw new Error('Duplicate catalog slug: '+row.slug);
   if(!seen.has(row.parent)) throw new Error('Unresolved category parent: '+row.parent);
   if(!/^[a-z0-9-]+$/.test(row.slug)) throw new Error('Invalid category slug');
   seen.add(row.slug);
 }
}
validateCategorySeed(MARKETPLACE_CATEGORY_TREE);
