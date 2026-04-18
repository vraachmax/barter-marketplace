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
    <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4 md:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Характеристики</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Параметры из формы размещения.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-card/80 px-3 py-2.5"
          >
            <dt className="text-xs font-medium text-muted-foreground">{getListingAttrLabel(key)}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {formatListingAttributeValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
