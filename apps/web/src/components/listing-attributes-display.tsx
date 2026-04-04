import { formatListingAttributeValue, getListingAttrLabel } from '@/lib/listing-attributes-config';

type Props = {
  attributes: unknown;
};

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export default function ListingAttributesDisplay({ attributes }: Props) {
  if (!isPlainRecord(attributes)) return null;
  const entries = Object.entries(attributes).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim().length > 0,
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 md:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Характеристики</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Параметры из формы размещения (как на Avito и зарубежных маркетплейсах).
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950/60"
          >
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{getListingAttrLabel(key)}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatListingAttributeValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
