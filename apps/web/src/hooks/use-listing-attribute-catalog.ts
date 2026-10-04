'use client';

import { useEffect, useState } from 'react';
import { apiFetchJson } from '@/lib/api';
import {
  getListingAttrSectionsForCategorySlug, withCatalogFieldDefinitions, withCatalogOptions,
  type CatalogAttributeOption, type CatalogAttributeSchema,
} from '@/lib/listing-attributes-config';

/** One loader for creation and editing. Replies belong to a category and parent selection. */
export function useListingAttributeCatalog(categoryId: string, slug: string, values: Record<string, string>) {
  const [revision, setRevision] = useState(0);
  const [root, setRoot] = useState<{
    key: string; schema: CatalogAttributeSchema | null; choices: CatalogAttributeOption[]; error: string;
  } | null>(null);
  const [children, setChildren] = useState<{
    key: string; choices: CatalogAttributeOption[]; error: string;
  } | null>(null);
  const requestKey = `${categoryId}:${revision}`;
  const current = root?.key === requestKey ? root : null;
  const schema = current?.schema ?? null;
  const parents = schema?.optionsQueryVersion === 1
    ? schema.fields.filter(field => field.fieldType === 'select' && field.parentKey)
      .map(field => [field.key, field.parentKey!, values[field.parentKey!] ?? ''])
    : [];
  const parentSignature = JSON.stringify(parents);
  const childKey = `${requestKey}:${parentSignature}`;

  useEffect(() => {
    if (!categoryId) return;
    let alive = true;
    const signal = AbortSignal.timeout(20000);
    void (async () => {
      const base = `/categories/${encodeURIComponent(categoryId)}`;
      const response = await apiFetchJson<CatalogAttributeSchema>(`${base}/attribute-schema`, { signal });
      if (!response.ok || !Array.isArray(response.data?.fields)) {
        if (alive) setRoot({ key: requestKey, schema: null, choices: [], error: 'Не удалось загрузить характеристики.' });
        return;
      }
      const schema = response.data;
      const urls = schema.optionsQueryVersion === 1
        ? schema.fields.filter(field => field.fieldType === 'select' && !field.parentKey)
          .map(field => `${base}/attribute-options?fieldKey=${encodeURIComponent(field.key)}`)
        : [`${base}/attribute-options`];
      const responses = await Promise.all(urls.map(url => apiFetchJson<CatalogAttributeOption[]>(url, { signal })));
      if (alive) setRoot({ key: requestKey, schema,
        choices: responses.flatMap(r => r.ok && Array.isArray(r.data) ? r.data : []),
        error: responses.some(r => !r.ok || !Array.isArray(r.data)) ? 'Не удалось загрузить варианты характеристик.' : '',
      });
    })();
    return () => { alive = false; };
  }, [categoryId, requestKey]);

  useEffect(() => {
    if (!categoryId || !current || current.error) return;
    const selected = (JSON.parse(parentSignature) as string[][]).filter(([, , value]) => value);
    if (!selected.length) return;
    let alive = true;
    const signal = AbortSignal.timeout(20000);
    void (async () => {
      const responses = await Promise.all(selected.map(([fieldKey, parentFieldKey, parentValue]) => {
        const query = new URLSearchParams({ fieldKey, parentFieldKey, parentValue });
        return apiFetchJson<CatalogAttributeOption[]>(`/categories/${encodeURIComponent(categoryId)}/attribute-options?${query}`, { signal });
      }));
      if (alive) setChildren({ key: childKey,
        choices: responses.flatMap(r => r.ok && Array.isArray(r.data) ? r.data : []),
        error: responses.some(r => !r.ok || !Array.isArray(r.data)) ? 'Не удалось загрузить зависимые варианты.' : '',
      });
    })();
    return () => { alive = false; };
  }, [categoryId, current, parentSignature, childKey]);

  const needsChildren = parents.some(([, , value]) => value);
  const child = children?.key === childKey ? children : null;
  const choices = [...(current?.choices ?? []), ...(needsChildren ? child?.choices ?? [] : [])];
  const error = current?.error || (needsChildren ? child?.error : '') || '';
  return {
    schema, choices, error,
    loading: Boolean(categoryId && !error && (!current || (needsChildren && !child))),
    retry: () => setRevision(value => value + 1),
    sections: withCatalogOptions(withCatalogFieldDefinitions(getListingAttrSectionsForCategorySlug(slug), schema), choices, values),
  };
}
