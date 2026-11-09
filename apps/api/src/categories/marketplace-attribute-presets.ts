/**
 * Curated initial attribute coverage for all root categories. Exact model and
 * generation completeness is tracked separately; unverified combinations
 * must never be invented. Existing stable auto catalog IDs remain untouched.
 */
export type FieldPreset = {
 key:string;label:string;sectionId:string;sectionTitle:string;
 fieldType?:'select'|'number'|'text';parentKey?:string;
 options?: ReadonlyArray<readonly [string,string]>;
};
const f=(key:string,label:string,options?:string,fieldType:'select'|'number'|'text'='select'):FieldPreset=>({
 key,label,sectionId:'details',sectionTitle:'Характеристики',fieldType,
 ...(options?{options:options.split('|').map(name=>[name,name] as const)}:{})
});
const condition=f('item_condition','Состояние','Новое|Как новое|Отличное|Хорошее|Есть дефекты|На запчасти');
const color=f('item_color','Цвет','Чёрный|Белый|Серый|Синий|Красный|Зелёный|Золотой|Бежевый|Другой');
const year=f('manufacture_year','Год выпуска',undefined,'number');
const brandText=f('brand_text','Бренд',undefined,'text');
const area=f('area_m2','Площадь, м²',undefined,'number');
const deal:FieldPreset={...f('deal_type','Тип сделки'),options:[['sale','Продажа'],['rent_long','Аренда длительная'],['rent_daily','Аренда посуточная']]};
const floor=f('floor','Этаж',undefined,'number');
const floors=f('floors_total','Этажей в доме',undefined,'number');
const room:FieldPreset={...f('rooms','Комнат'),options:[['studio','Студия'],['1','1'],['2','2'],['3','3'],['4plus','4+']]};
const storage=f('storage_gb','Память','16 ГБ|32 ГБ|64 ГБ|128 ГБ|256 ГБ|512 ГБ|1 ТБ|2 ТБ');
const root:Record<string,readonly FieldPreset[]> = {
 electronics:[condition,color,year,brandText],
 realty:[deal,area,floor,floors,f('building_type','Тип здания','Монолит|Кирпич|Панель|Блок|Дерево|Другое'),f('renovation','Ремонт','Без ремонта|Косметический|Евроремонт|Дизайнерский')],
 auto:[],
 home:[condition,color,brandText],
 clothes:[condition,color,f('clothing_size','Размер','XS|S|M|L|XL|XXL|3XL|4XL|Другое'),f('clothing_material','Материал','Хлопок|Шерсть|Кожа|Синтетика|Лён|Другой')],
 kids:[condition,color,brandText,f('age_range','Возраст','0-6 мес|6-12 мес|1-3 года|3-6 лет|6-10 лет|10-14 лет|14+')],
 hobby:[condition,brandText],
 services:[{...f('service_format','Формат'),options:[['at_client','Выезд к клиенту'],['remote','Онлайн'],['both','Выезд и онлайн']]},f('experience_years','Опыт, лет',undefined,'number'),f('price_unit','Оплата','За час|За день|За услугу|По договорённости')],
 job:[f('employment_type','Занятость','Полная|Частичная|Проектная|Стажировка'),{...f('work_schedule','График'),options:[['5_2','5/2'],['2_2','2/2'],['6_1','6/1'],['shift','Сменный'],['rotation','Вахта'],['flexible','Гибкий']] },f('salary_from','Зарплата от, ₽',undefined,'number')],
};
const electronicsBrand: FieldPreset = {key:'device_brand',label:'Бренд',sectionId:'details',sectionTitle:'Характеристики',fieldType:'select'};
const electronicsModel: FieldPreset = {key:'device_model',label:'Модель',sectionId:'details',sectionTitle:'Характеристики',fieldType:'select',parentKey:'device_brand'};
const special:Record<string,readonly FieldPreset[]> = {
 'electronics-phones':[electronicsBrand,electronicsModel,storage,f('sim_type','SIM','Одна SIM|Две SIM|eSIM|SIM + eSIM'),f('screen_condition','Экран','Без царапин|Мелкие царапины|Повреждён')],
 'electronics-computers':[electronicsBrand,electronicsModel,storage,f('ram_gb','ОЗУ','4 ГБ|8 ГБ|16 ГБ|24 ГБ|32 ГБ|64 ГБ|128 ГБ'),f('processor','Процессор',undefined,'text'),f('graphics','Видеокарта',undefined,'text')],
 'electronics-tablets':[electronicsBrand,electronicsModel,storage,f('connectivity','Связь','Wi-Fi|Wi-Fi + LTE|Wi-Fi + 5G')],
 'electronics-photo-video':[electronicsBrand,electronicsModel,f('sensor_type','Тип матрицы','Полнокадровая|APS-C|Micro 4/3|Компактная')],
 'electronics-tv-audio':[electronicsBrand,electronicsModel,f('display_size_in','Диагональ, дюймы',undefined,'number'),f('resolution','Разрешение','HD|Full HD|2K|4K|8K')],
 'electronics-gaming':[electronicsBrand,electronicsModel,f('platform','Платформа','PlayStation|Xbox|Nintendo|ПК|Другая'),storage],
 'electronics-appliances':[electronicsBrand,electronicsModel,f('energy_class','Класс энергопотребления','A|B|C|D|E|F|G')],
 'realty-apartments':[room,f('bathrooms','Санузел','Совмещённый|Раздельный|Два и более'),f('balcony','Балкон','Нет|Балкон|Лоджия|Несколько')],
 'realty-houses':[room,area,f('land_area_sotka','Участок, соток',undefined,'number'),f('heating','Отопление','Газ|Электричество|Центральное|Твердотопливное|Нет')],
 'realty-land':[f('land_area_sotka','Участок, соток',undefined,'number'),f('land_purpose','Назначение','ИЖС|СНТ|ЛПХ|Коммерческое|Сельхоз')],
 'realty-commercial-realty':[f('commercial_purpose','Назначение','Офис|Торговля|Склад|Производство|Общепит|Универсальное')],
 'auto-motorcycles':[condition,year,f('moto_type','Тип мотоцикла','Дорожный|Спортивный|Эндуро|Кроссовый|Чоппер|Туристический|Скутер'),f('engine_cc','Объём двигателя, см³',undefined,'number'),f('mileage_km','Пробег, км',undefined,'number'),brandText],
 'auto-commercial-vehicles':[condition,year,f('truck_weight_t','Грузоподъёмность, т',undefined,'number'),f('mileage_km','Пробег, км',undefined,'number'),brandText],
 'auto-special-equipment':[condition,year,f('operating_hours','Моточасы',undefined,'number'),f('capacity_t','Грузоподъёмность, т',undefined,'number'),brandText],
 'auto-auto-parts':[condition,f('compatibility','Совместимость с маркой и моделью',undefined,'text'),brandText],
 'home-furniture':[f('furniture_material','Материал','Дерево|МДФ|Металл|Стекло|Пластик|Ткань|Кожа'),f('width_cm','Ширина, см',undefined,'number'),f('height_cm','Высота, см',undefined,'number')],
 'home-tools':[f('tool_type','Тип инструмента',undefined,'text')],
 'home-building-materials':[f('quantity','Количество',undefined,'number'),f('material','Материал',undefined,'text')],
 'clothes-footwear':[f('shoe_size_eu','Размер EU','35|36|37|38|39|40|41|42|43|44|45|46|47')],
 'hobby-sports':[f('sport_type','Вид спорта',undefined,'text')],
 'hobby-music':[f('instrument_type','Тип инструмента',undefined,'text')],
 'services-equipment-rental':[f('capacity_t','Грузоподъёмность, т',undefined,'number'),f('min_shift_hours','Минимальная смена, часов',undefined,'number'),f('with_operator','С оператором','Да|Нет')],
};
export function fieldsForCategory(rootSlug:string,groupSlug:string):readonly FieldPreset[] {
 const base=root[rootSlug]??[];
 const extra=special[groupSlug]??[];
 const result=new Map<string,FieldPreset>();
 for(const field of [...base,...extra]) result.set(field.key,field);
 return [...result.values()];
}
export function fieldsForRoot(rootSlug:string):readonly FieldPreset[] {return root[rootSlug]??[];}
export const CATALOG_FIELD_GROUPS=Object.keys(special);

/** Stable machine-readable select keys for server-side option enforcement. */
export const CATALOG_OPTION_KEYS = [...new Set(['device_brand','device_model','vehicle_make','vehicle_model',
  ...[...Object.values(root).flat(),...Object.values(special).flat()]
   .filter(field=>field.options?.length)
   .map(field=>field.key)
])];
