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
    <section className="border-t border-border pt-6">
      <h2 className="text-xl font-semibold tracking-tight">Характеристики</h2>
      <dl className="mt-3 divide-y divide-border">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="grid min-w-0 gap-1 py-3 sm:grid-cols-2 sm:gap-6"
          >
            <dt className="text-sm text-muted-foreground">{getListingAttrLabel(key)}</dt>
            <dd className="break-words text-base font-medium text-foreground">
              {formatListingAttributeValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
