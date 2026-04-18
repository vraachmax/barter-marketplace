'use client';

import { Fragment } from 'react';
import type { ListingAttrSection } from '@/lib/listing-attributes-config';
import { UiSelect } from '@/components/ui-select';

type Props = {
  sections: ListingAttrSection[];
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
};

export default function ListingCategoryAttributesForm({ sections, values, onFieldChange }: Props) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <Fragment key={section.id}>
          <div className="border-t border-border pt-6 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            {section.subtitle ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.subtitle}</p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.key} className={field.type === 'text' ? 'sm:col-span-2' : undefined}>
                  <div className="mb-1.5 text-sm font-medium text-foreground">{field.label}</div>
                  {field.hint ? (
                    <p className="mb-1.5 text-xs text-muted-foreground">{field.hint}</p>
                  ) : null}
                  {field.type === 'select' && field.options?.length ? (
                    <UiSelect
                      value={values[field.key] ?? ''}
                      onChange={(v) => onFieldChange(field.key, v)}
                      options={[{ value: '', label: 'Не выбрано' }, ...field.options]}
                      className="h-11 w-full rounded-xl border-border bg-muted/50 px-3 text-sm focus:border-primary/30"
                    />
                  ) : null}
                  {field.type === 'text' ? (
                    <input
                      className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none transition focus:border-primary/30 focus:bg-card focus:ring-2 focus:ring-primary/30"
                      value={values[field.key] ?? ''}
                      onChange={(e) => onFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : null}
                  {field.type === 'number' ? (
                    <input
                      className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none transition focus:border-primary/30 focus:bg-card focus:ring-2 focus:ring-primary/30"
                      value={values[field.key] ?? ''}
                      onChange={(e) => onFieldChange(field.key, e.target.value.replace(/[^\d.,\s-]/g, ''))}
                      placeholder={field.placeholder}
                      inputMode="decimal"
                    />
                  ) : null}
                </label>
              ))}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
