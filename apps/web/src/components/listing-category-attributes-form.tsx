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
          <div className="border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
            {section.subtitle ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{section.subtitle}</p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.key} className={field.type === 'text' ? 'sm:col-span-2' : undefined}>
                  <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{field.label}</div>
                  {field.hint ? (
                    <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">{field.hint}</p>
                  ) : null}
                  {field.type === 'select' && field.options?.length ? (
                    <UiSelect
                      value={values[field.key] ?? ''}
                      onChange={(v) => onFieldChange(field.key, v)}
                      options={[{ value: '', label: 'Не выбрано' }, ...field.options]}
                      className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 px-3 text-sm focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  ) : null}
                  {field.type === 'text' ? (
                    <input
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500"
                      value={values[field.key] ?? ''}
                      onChange={(e) => onFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : null}
                  {field.type === 'number' ? (
                    <input
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500"
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
