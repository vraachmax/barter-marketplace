# Каталог изображений Barter

Все ссылки ведут на оптимизированные WebP в этой папке. Основной вариант экранов — `refined-v2`, остальные — архив концепции.

| Группа | Назначение | Файл |
|---|---|---|
| UI v1 | Главная | [home.webp](screens/concept-v1/home.webp) |
| UI v1 | Каталог смартфонов | [catalog-smartphones.webp](screens/concept-v1/catalog-smartphones.webp) |
| UI v1 | Карточка объявления | [listing-detail.webp](screens/concept-v1/listing-detail.webp) |
| UI v1 | Сообщения | [chat.webp](screens/concept-v1/chat.webp) |
| UI v1 | Предложение обмена | [exchange-offer.webp](screens/concept-v1/exchange-offer.webp) |
| UI v1 | Публикация объявления | [create-listing.webp](screens/concept-v1/create-listing.webp) |
| UI v1 | Фильтры | [filters.webp](screens/concept-v1/filters.webp) |
| UI v1 | Профиль | [profile.webp](screens/concept-v1/profile.webp) |
| UI v1 | Уведомления | [notifications.webp](screens/concept-v1/notifications.webp) |
| UI v1 | Главная, тёмная тема | [home-dark.webp](screens/concept-v1/home-dark.webp) |
| UI v2 | Главная | [home.webp](screens/refined-v2/home.webp) |
| UI v2 | Каталог смартфонов | [catalog-smartphones.webp](screens/refined-v2/catalog-smartphones.webp) |
| UI v2 | Карточка объявления | [listing-detail.webp](screens/refined-v2/listing-detail.webp) |
| UI v2 | Сообщения | [chat.webp](screens/refined-v2/chat.webp) |
| UI v2 | Предложение обмена | [exchange-offer.webp](screens/refined-v2/exchange-offer.webp) |
| UI v2 | Публикация объявления | [create-listing.webp](screens/refined-v2/create-listing.webp) |
| UI v2 | Фильтры | [filters.webp](screens/refined-v2/filters.webp) |
| UI v2 | Профиль | [profile.webp](screens/refined-v2/profile.webp) |
| UI v2 | Уведомления | [notifications.webp](screens/refined-v2/notifications.webp) |
| UI v2 | Главная, тёмная тема | [home-dark.webp](screens/refined-v2/home-dark.webp) |
| Бренд | Логотип для светлого фона | [wordmark-light.webp](assets/branding/wordmark-light.webp) |
| Бренд | Логотип для тёмного фона | [wordmark-dark.webp](assets/branding/wordmark-dark.webp) |
| Бренд | Знак для светлого фона | [symbol-light.webp](assets/branding/symbol-light.webp) |
| Бренд | Знак для тёмного фона | [symbol-dark.webp](assets/branding/symbol-dark.webp) |
| Заглушка | Игровые приставки | [gaming.webp](assets/placeholders/gaming.webp) |
| Заглушка | Недвижимость | [real-estate.webp](assets/placeholders/real-estate.webp) |
| Заглушка | Другое | [miscellaneous.webp](assets/placeholders/miscellaneous.webp) |
| Заглушка | Ноутбуки | [laptops.webp](assets/placeholders/laptops.webp) |
| Заглушка | Мебель | [furniture.webp](assets/placeholders/furniture.webp) |
| Заглушка | Одежда | [clothing.webp](assets/placeholders/clothing.webp) |
| Заглушка | Услуги | [services.webp](assets/placeholders/services.webp) |
| Заглушка | Часы | [watches.webp](assets/placeholders/watches.webp) |
| Заглушка | Наушники | [headphones.webp](assets/placeholders/headphones.webp) |
| Заглушка | Автомобили | [cars.webp](assets/placeholders/cars.webp) |
| Заглушка | Спецтехника | [heavy-machinery.webp](assets/placeholders/heavy-machinery.webp) |
| Заглушка | Смартфоны | [smartphones.webp](assets/placeholders/smartphones.webp) |
| Заглушка | Услуги, альтернативный вариант | [services-alt.webp](assets/placeholders/services-alt.webp) |
| Заглушка | Спецтехника, альтернативный вариант | [heavy-machinery-alt.webp](assets/placeholders/heavy-machinery-alt.webp) |
| UI overview | Начальная сводная доска | [initial-overview.webp](screens/initial-overview.webp) |

## Требования к использованию

* Автоплейсхолдеры подставляются только при отсутствии фотографий продавца.
* Маркировка «Нет фото · Иллюстрация категории» обязательна.
* `services` и `heavy-machinery` — верхнеуровневые варианты; для крана, самосвала, автовышки, экскаватора и конкретных услуг потребуются дополнительные ассеты, если нужен точный тип.
* Путь и класс изображения хранятся в `asset-manifest.json`; сопоставление с реальными `categoryId` сделать после проверки категорий в БД.
* Логотипы показаны на белом/чёрном фоне и пока не являются прозрачными SVG/PNG. Для app icon, favicon, masked icon и мелких размеров нужна отдельная техническая подготовка.
* Все макеты — визуальные референсы; цены и профили на них вымышлены.
