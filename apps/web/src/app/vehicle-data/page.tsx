import Link from 'next/link';
import { VEHICLESDB_ATTRIBUTION } from '@/lib/vehiclesdb-attribution';

export default function VehicleDataPage() {
  return <main className="mx-auto max-w-3xl px-4 py-8 text-foreground">
    <h1 className="text-2xl font-semibold">Источник данных автомобилей</h1>
    <p className="mt-4 text-sm leading-6">Марки и модели: <a className="underline" href="https://github.com/vehiclesdb/vehiclesdb/tree/v2026.09.1">VehiclesDB, выпуск v2026.09.1</a>, лицензия <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Исходные записи преобразованы в значения и подписи для выбора марки и модели; порядок отображения сохранён. Справочник не гарантирует полноту рынка РФ, не содержит поколений или комплектаций.</p>
    <h2 className="mt-8 text-lg font-semibold">Дополнение для российского рынка</h2>
    <p className="mt-3 text-sm leading-6">Отдельный набор Бартера от 5 октября 2026 года добавляет 3 марки и 10 моделей. Проверены только названия и связь марки с моделью по официальным страницам: <a className="underline" href="https://tank.ru/">TANK 300/500</a>, <a className="underline" href="https://belgee.ru/">Belgee X50/X70</a>, <a className="underline" href="https://exeed.ru/cars/">EXEED LX/TXL</a>, <a className="underline" href="https://www.geely-motors.com/model/">Geely Monjaro/Coolray</a>, <a className="underline" href="https://haval.ru/models/haval-m6/">Haval M6</a> и <a className="underline" href="https://moskvich.ru/">Москвич 3</a>. Это дополнение не является выпуском VehiclesDB. Поколения, комплектации, цены и характеристики из этих страниц не переносились; полнота каталога не гарантируется.</p>
    <h2 className="mt-8 text-lg font-semibold">Уведомления источника и первичных реестров</h2>
    <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-muted p-4 font-sans text-sm leading-6">{VEHICLESDB_ATTRIBUTION}</pre>
    <Link href="/search" className="mt-6 inline-block underline">К поиску</Link>
  </main>;
}
