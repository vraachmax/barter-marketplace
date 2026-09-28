'use client';
import { useEffect, useState, useId } from 'react';
import { apiGetJson } from '@/lib/api';
import { type CatalogSchema, type CatalogField, changeCatalogValue } from '@/lib/catalog-schema';

export function useCatalogSchema(categoryId: string) {
  const [state, setState] = useState<{ categoryId: string; fields: CatalogField[]; error: boolean }>({ categoryId: '', fields: [], error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!categoryId) return;
    const controller = new AbortController();
    void apiGetJson<CatalogSchema>(`/categories/${encodeURIComponent(categoryId)}/attributes`, { signal: controller.signal })
      .then(data => {
        if (data?.version !== 1 || !Array.isArray(data.fields)) throw new Error('unsupported_catalog_schema');
        if (!controller.signal.aborted) setState({ categoryId, fields: data.fields, error: false });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ categoryId, fields: [], error: true }); });
    return () => controller.abort();
  }, [categoryId, retry]);
  const current = state.categoryId === categoryId;
  return { fields: current ? state.fields : [], loading: Boolean(categoryId && !current), error: current && state.error,
    retry: () => { setState({ categoryId: '', fields: [], error: false }); setRetry(x => x + 1); } };
}

export function CatalogFields({ fields, values, onChange, filters = false }: {
  fields: CatalogField[]; values: Record<string, string>; onChange: (values: Record<string, string>) => void; filters?: boolean;
}) {
  const id = useId();
  if (!fields.length) return null;
  return <fieldset className="grid gap-4 sm:grid-cols-2">
    <legend className="mb-4 text-base font-semibold">Характеристики</legend>
    {fields.map(field => {
      const value = values[field.key] ?? '';
      const options = field.options.filter(o => o.enabled && (!field.dependsOnKey || o.parentValue === values[field.dependsOnKey]));
      const legacy = Boolean(value && !options.some(o => o.value === value));
      return <div key={field.key} className="min-w-0">
        <label htmlFor={id + field.key} className="mb-2 block text-sm font-medium">{field.label}</label>
        <select id={id + field.key} value={value} disabled={Boolean(field.dependsOnKey && !values[field.dependsOnKey])}
          onChange={e => onChange(changeCatalogValue(fields, values, field.key, e.target.value))}
          className="min-h-12 w-full min-w-0 rounded-2xl border border-border bg-muted px-3 text-base text-foreground">
          <option value="">{filters ? 'Любой вариант' : 'Не выбрано'}</option>
          {legacy ? <option value={value}>Ранее указано: {value}</option> : null}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>;
    })}
  </fieldset>;
}
export function CatalogSchemaStatus({ schema }: { schema: ReturnType<typeof useCatalogSchema> }) {
  if (schema.loading) return <p role="status" className="text-sm text-muted-foreground">Загружаем характеристики…</p>;
  if (schema.error) return <div role="alert" className="space-y-2 text-sm"><p>Не удалось загрузить характеристики.</p><button type="button" onClick={schema.retry} className="min-h-11 rounded-full border px-4">Повторить загрузку характеристик</button></div>;
  return null;
}

