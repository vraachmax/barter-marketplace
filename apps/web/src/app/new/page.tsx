'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  Circle,
  FileText,
  LayoutGrid,
  MapPin,
  PlusCircle,
  UserCircle,
  Wallet,
} from 'lucide-react';
import {
  API_URL,
  apiFetchJson,
  apiGetJson,
  apiUploadImage,
  type AuthMe,
  type Category,
} from '@/lib/api';
import { UiSelect } from '@/components/ui-select';
import ListingCategoryAttributesForm from '@/components/listing-category-attributes-form';
import {
  getListingAttrSectionsForCategorySlug,
  serializeListingAttributes,
} from '@/lib/listing-attributes-config';

type CreateListingPayload = {
  title: string;
  description: string;
  priceRub?: number;
  city: string;
  categoryId: string;
  attributes?: Record<string, string | number | boolean>;
};

type PendingPhoto = { id: string; file: File; url: string };

function newPendingId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function NewListingPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [me, setMe] = useState<AuthMe | null | 'loading'>('loading');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [city, setCity] = useState('Москва');
  const [categoryId, setCategoryId] = useState<string>('');
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'error'; msg: string } | { kind: 'ok'; id: string }
  >({ kind: 'idle' });
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string }>>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [justPublished, setJustPublished] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(pendingPhotos);
  pendingRef.current = pendingPhotos;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGetJson<Category[]>('/categories');
        if (!alive) return;
        setCats(data);
        setCategoryId((prev) => prev || data[0]?.id || '');
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await apiFetchJson<AuthMe>('/auth/me');
      if (!alive) return;
      setMe(res.ok ? res.data : null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  useEffect(() => {
    setAttrValues({});
  }, [categoryId]);

  const selectedCategorySlug = useMemo(() => {
    const c = cats.find((x) => x.id === categoryId);
    return c?.slug ?? '';
  }, [cats, categoryId]);

  const attrSections = useMemo(
    () => getListingAttrSectionsForCategorySlug(selectedCategorySlug),
    [selectedCategorySlug],
  );

  const serializedAttributes = useMemo(
    () => serializeListingAttributes(attrSections, attrValues),
    [attrSections, attrValues],
  );

  const revokePending = useCallback((items: PendingPhoto[]) => {
    items.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  const payload = useMemo<CreateListingPayload>(() => {
    const p: CreateListingPayload = {
      title: title.trim(),
      description: description.trim(),
      city: city.trim(),
      categoryId,
    };
    const pr = Number(price);
    if (price.trim().length > 0 && Number.isFinite(pr)) p.priceRub = pr;
    if (serializedAttributes) p.attributes = serializedAttributes;
    return p;
  }, [title, description, city, categoryId, price, serializedAttributes]);

  const titleLen = title.trim().length;
  const descLen = description.trim().length;

  function validate() {
    if (payload.title.length < 3) return 'Название: минимум 3 символа';
    if (payload.description.length < 10) return 'Описание: минимум 10 символов';
    if (payload.city.length < 2) return 'Город: минимум 2 символа';
    if (!payload.categoryId) return 'Выберите категорию';
    return null;
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setPendingPhotos((prev) => {
      const next = imageFiles.map((file) => ({
        id: newPendingId(),
        file,
        url: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
  }

  function removePending(id: string) {
    setPendingPhotos((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function uploadPendingToListing(listingId: string, photos: PendingPhoto[]) {
    if (photos.length === 0) return;
    setUploading(true);
    const uploaded: Array<{ id: string; url: string }> = [];
    const doneIds = new Set(photos.map((p) => p.id));
    try {
      for (const { file } of photos) {
        const res = await apiUploadImage(`/listings/${listingId}/images`, file);
        if (res.ok) {
          uploaded.push({ id: res.data.id as string, url: res.data.url as string });
        }
      }
      setUploadedImages((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      revokePending(photos);
      setPendingPhotos((prev) => prev.filter((p) => !doneIds.has(p.id)));
    }
  }

  async function submit() {
    const validationError = validate();
    if (validationError) {
      setStatus({ kind: 'error', msg: validationError });
      return;
    }
    setBusy(true);
    setStatus({ kind: 'idle' });
    const photosSnapshot = [...pendingPhotos];
    const res = await apiFetchJson<{ id: string }>('/listings', { method: 'POST', body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 401) {
        setStatus({ kind: 'error', msg: 'Нужно войти в аккаунт, чтобы опубликовать объявление.' });
      } else {
        const code = res.message;
        const friendly =
          code === 'listing_daily_limit'
            ? 'С аккаунта уже создано 9 объявлений за сегодня (лимит). Попробуйте завтра или удалите черновик.'
            : code === 'listing_duplicate_similarity'
              ? 'Текст почти совпадает с уже размещённым объявлением (≥90%). Измените заголовок или описание.'
              : res.message;
        setStatus({ kind: 'error', msg: friendly });
      }
      return;
    }
    const id = res.data?.id;
    if (id) {
      setStatus({ kind: 'ok', id });
      setTitle('');
      setDescription('');
      setPrice('');
      setAttrValues({});
      setUploadedImages([]);
      setJustPublished(true);
      window.setTimeout(() => setJustPublished(false), 2800);
      if (photosSnapshot.length > 0) {
        await uploadPendingToListing(id, photosSnapshot);
      }
    } else setStatus({ kind: 'error', msg: 'created_but_no_id' });
  }

  function resetCreateFlow() {
    revokePending(pendingPhotos);
    setPendingPhotos([]);
    setStatus({ kind: 'idle' });
    setUploadedImages([]);
    setJustPublished(false);
    setAttrValues({});
  }

  async function uploadMoreFiles(files: FileList | null) {
    if (!files || status.kind !== 'ok') return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const res = await apiUploadImage(`/listings/${status.id}/images`, file);
      if (res.ok) {
        setUploadedImages((prev) => [...prev, { id: res.data.id as string, url: res.data.url as string }]);
      }
    }
    setUploading(false);
  }

  const step1Done = status.kind === 'ok';
  const showPostPublishPhotos = status.kind === 'ok';

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400"
            >
              <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
              На главную
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">Новое объявление</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              Как на крупных площадках: сначала фото и описание, затем публикация. Фото можно добавить до или сразу после
              размещения.
            </p>
          </div>

          {/* Steps — eBay / Marketplace style */}
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2">
              {step1Done ? (
                <CheckCircle size={24} strokeWidth={1.8} aria-hidden />
              ) : (
                <Circle size={22} strokeWidth={1.8} aria-hidden />
              )}
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">1. Детали</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Текст и параметры</div>
              </div>
            </div>
            <div className="mx-2 hidden h-8 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" aria-hidden />
            <div className="flex items-center gap-2">
              {uploadedImages.length > 0 || pendingPhotos.length > 0 ? (
                <CheckCircle size={24} strokeWidth={1.8} aria-hidden />
              ) : (
                <Circle size={22} strokeWidth={1.8} className="opacity-40" aria-hidden />
              )}
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">2. Фото</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">До публикации или после</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:flex lg:gap-10 lg:px-8">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Photos */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-sky-50/80 to-cyan-50/50 px-5 py-4 dark:border-zinc-800 dark:from-sky-950/40 dark:to-cyan-950/30">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100 dark:bg-zinc-900 dark:ring-sky-900/40">
                  <Camera size={22} strokeWidth={1.8} aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Фотографии</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Первое фото — обложка в ленте. Перетащите файлы или нажмите «Добавить».
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {!showPostPublishPhotos ? (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      addFiles(e.dataTransfer.files);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                    className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 transition ${
                      dragOver
                        ? 'border-sky-500 bg-sky-50/80 dark:border-sky-500 dark:bg-sky-950/40'
                        : 'border-zinc-200 bg-zinc-50/50 hover:border-sky-300 hover:bg-sky-50/40 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-sky-600 dark:hover:bg-sky-950/30'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <PlusCircle size={44} strokeWidth={1.8} aria-hidden />
                    <p className="mt-3 text-center text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Перетащите сюда изображения
                    </p>
                    <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">JPG, PNG, WEBP · несколько файлов</p>
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/25 hover:from-sky-700 hover:to-cyan-700">
                      <PlusCircle size={16} strokeWidth={1.8} aria-hidden />
                      Выбрать файлы
                    </span>
                  </div>

                  {pendingPhotos.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Готово к загрузке ({pendingPhotos.length})
                      </div>
                      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {pendingPhotos.map((p) => (
                          <li key={p.id} className="listing-thumb-wrap group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="listing-thumb-img h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePending(p.id);
                              }}
                              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/75"
                              aria-label="Удалить фото"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Объявление опубликовано. Ниже можно добавить ещё фото или перейти к карточке.
                  </p>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 hover:border-sky-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-sky-600">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => void uploadMoreFiles(e.target.files)}
                    />
                    <PlusCircle size={36} strokeWidth={1.8} aria-hidden />
                    <span className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Добавить ещё фото</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файлы'}
                    </span>
                  </label>
                  {uploadedImages.length > 0 ? (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {uploadedImages.map((img) => (
                        <li
                          key={img.id}
                          className="listing-thumb-wrap aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${API_URL}${img.url}`}
                            alt=""
                            className="listing-thumb-img h-full w-full object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/listing/${status.id}`}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/25 hover:from-sky-700 hover:to-cyan-700"
                    >
                      Открыть объявление
                    </Link>
                    <button
                      type="button"
                      onClick={resetCreateFlow}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Создать ещё одно
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Title & description */}
          {!showPostPublishPhotos ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <FileText size={22} strokeWidth={1.8} aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Описание</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Чем подробнее — тем быстрее найдётся покупатель</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Название</span>
                      <span className={`text-xs ${titleLen < 3 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {titleLen} симв. · мин. 3
                      </span>
                    </div>
                    <input
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: iPhone 14 Pro Max 256 ГБ"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Описание</span>
                      <span className={`text-xs ${descLen < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {descLen} симв. · мин. 10
                      </span>
                    </div>
                    <textarea
                      className="min-h-40 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Состояние, комплект, дефекты, история покупки, способ передачи…"
                    />
                  </label>

                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
                    <span className="font-semibold">Совет: </span>
                    укажите реальное состояние и комплектацию — так меньше вопросов в чате и выше доверие.
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
                    <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Характеристики по категории</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Разделы меняются при смене категории — логика как у Avito и западных карточек (eBay, Amazon, Vinted).
                    </p>
                  </div>
                </div>
                <ListingCategoryAttributesForm
                  sections={attrSections}
                  values={attrValues}
                  onFieldChange={(key, v) => setAttrValues((prev) => ({ ...prev, [key]: v }))}
                />
              </section>
            </div>
          ) : (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:shadow-black/30 sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle size={30} strokeWidth={1.8} className="shrink-0" aria-hidden />
                <div>
                  <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">Объявление опубликовано</h2>
                  <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                    Добавьте ещё снимки выше при необходимости — карточка уже видна в поиске.
                  </p>
                  <Link
                    href={`/listing/${status.id}`}
                    className="mt-3 inline-flex text-sm font-semibold text-emerald-800 underline hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
                  >
                    Перейти к объявлению →
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="mt-6 space-y-6 lg:mt-0 lg:w-[380px] lg:shrink-0">
          {/* Auth */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <UserCircle size={22} strokeWidth={1.8} aria-hidden />
              Аккаунт
            </div>
            {me === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="inline-block size-[18px] animate-spin rounded-full border-2 border-sky-500 border-t-transparent" aria-hidden />
                Проверяем вход…
              </div>
            ) : me ? (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50/80 px-3 py-3 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900/50">
                <CheckCircle size={22} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Вы вошли в аккаунт</div>
                  <div className="truncate text-xs text-emerald-800/90 dark:text-emerald-300">
                    {me.name || me.email || me.phone || 'Пользователь'}
                  </div>
                  <Link href="/profile" className="mt-1 inline-block text-xs font-medium text-emerald-800 underline dark:text-emerald-300">
                    Мой профиль
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-sm text-amber-950 dark:text-amber-100">Для публикации нужен вход.</p>
                <Link
                  href="/auth"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 hover:from-sky-700 hover:to-cyan-700"
                >
                  Войти или зарегистрироваться
                </Link>
              </div>
            )}
          </div>

          {!showPostPublishPhotos ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                Цена и размещение
              </div>

              <div className="space-y-4">
                <label className="block">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Wallet size={16} strokeWidth={1.8} className="opacity-70" aria-hidden />
                    Цена (₽)
                  </div>
                  <input
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Например: 122000"
                    inputMode="numeric"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Оставьте пустым, если цена договорная</p>
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <MapPin size={16} strokeWidth={1.8} className="opacity-70" aria-hidden />
                    Город
                  </div>
                  <input
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">Категория</div>
                  <UiSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    disabled={loadingCats}
                    options={cats.map((c) => ({ value: c.id, label: c.title }))}
                    className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-3 focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {status.kind === 'error' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{status.msg}</div>
          ) : null}

          {justPublished ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
              Готово! Объявление в ленте. Фото загружаются или уже на месте.
            </div>
          ) : null}

          {!showPostPublishPhotos ? (
            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-base font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-55"
              onClick={() => void submit()}
              disabled={busy || uploading || me === 'loading'}
              type="button"
            >
              {busy || uploading ? (
                <>
                  <span className="inline-block size-[22px] animate-spin rounded-full border-2 border-sky-500 border-t-transparent" aria-hidden />
                  {busy ? 'Публикуем…' : 'Загружаем фото…'}
                </>
              ) : (
                'Опубликовать объявление'
              )}
            </button>
          ) : null}

          {!showPostPublishPhotos ? (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Нажимая кнопку, вы подтверждаете корректность данных. При необходимости объявление можно изменить в профиле.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
