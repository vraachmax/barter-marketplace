import Link from 'next/link';
import { VEHICLESDB_ATTRIBUTION } from '@/lib/vehiclesdb-attribution';

export default function VehicleDataPage() {
  return <main className="mx-auto max-w-3xl px-4 py-8 text-foreground">
    <h1 className="text-2xl font-semibold">Источник данных автомобилей</h1>
    <p className="mt-4 text-sm leading-6">Марки и модели: <a className="underline" href="https://github.com/vehiclesdb/vehiclesdb/tree/v2026.09.1">VehiclesDB, выпуск v2026.09.1</a>, лицензия <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Исходные записи преобразованы в значения и подписи для выбора марки и модели; порядок отображения сохранён. Справочник не гарантирует полноту рынка РФ, не содержит поколений или комплектаций.</p>
    <h2 className="mt-8 text-lg font-semibold">Уведомления источника и первичных реестров</h2>
    <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-muted p-4 font-sans text-sm leading-6">{VEHICLESDB_ATTRIBUTION}</pre>
    <Link href="/search" className="mt-6 inline-block underline">К поиску</Link>
  </main>;
}
