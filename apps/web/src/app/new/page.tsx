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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
            : code === 'listing_active_limit'
              ? 'Достигнут лимит активных объявлений. Архивируйте старое или подключите Бартер Pro: /pricing'
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
    <div className="min-h-screen bg-muted text-foreground antialiased">
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
              На главную
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Новое объявление
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Как на крупных площадках: сначала фото и описание, затем публикация. Фото можно
              добавить до или сразу после размещения.
            </p>
          </div>

          {/* Steps indicator */}
          <Card className="flex shrink-0 flex-row items-center gap-2 rounded-2xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              {step1Done ? (
                <CheckCircle size={24} strokeWidth={1.8} className="text-secondary" aria-hidden />
              ) : (
                <Circle size={22} strokeWidth={1.8} className="text-primary" aria-hidden />
              )}
              <div>
                <div className="font-semibold text-foreground">1. Детали</div>
                <div className="text-xs text-muted-foreground">Текст и параметры</div>
              </div>
            </div>
            <div className="mx-2 hidden h-8 w-px bg-border sm:block" aria-hidden />
            <div className="flex items-center gap-2">
              {uploadedImages.length > 0 || pendingPhotos.length > 0 ? (
                <CheckCircle size={24} strokeWidth={1.8} className="text-secondary" aria-hidden />
              ) : (
                <Circle
                  size={22}
                  strokeWidth={1.8}
                  className="text-muted-foreground/50"
                  aria-hidden
                />
              )}
              <div>
                <div className="font-semibold text-foreground">2. Фото</div>
                <div className="text-xs text-muted-foreground">До публикации или после</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:flex lg:gap-10 lg:px-8">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Photos */}
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 border-b border-border bg-primary/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Camera size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Фотографии</h2>
                  <p className="text-xs text-muted-foreground">
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
                    className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 transition-colors ${
 dragOver
 ? 'border-primary bg-primary/10'
 : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/5'
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
                    <PlusCircle
                      size={44}
                      strokeWidth={1.8}
                      className="text-primary/70"
                      aria-hidden
                    />
                    <p className="mt-3 text-center text-sm font-medium text-foreground">
                      Перетащите сюда изображения
                    </p>
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                      JPG, PNG, WEBP · несколько файлов
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                      <PlusCircle size={16} strokeWidth={1.8} aria-hidden />
                      Выбрать файлы
                    </span>
                  </div>

                  {pendingPhotos.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Готово к загрузке ({pendingPhotos.length})
                      </div>
                      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {pendingPhotos.map((p) => (
                          <li
                            key={p.id}
                            className="listing-thumb-wrap group relative aspect-square overflow-hidden rounded-xl border border-border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt=""
                              className="listing-thumb-img h-full w-full object-cover"
                            />
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
                  <p className="text-sm text-muted-foreground">
                    Объявление опубликовано. Ниже можно добавить ещё фото или перейти к карточке.
                  </p>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => void uploadMoreFiles(e.target.files)}
                    />
                    <PlusCircle
                      size={36}
                      strokeWidth={1.8}
                      className="text-primary/70"
                      aria-hidden
                    />
                    <span className="mt-2 text-sm font-medium text-foreground">
                      Добавить ещё фото
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файлы'}
                    </span>
                  </label>
                  {uploadedImages.length > 0 ? (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {uploadedImages.map((img) => (
                        <li
                          key={img.id}
                          className="listing-thumb-wrap aspect-square overflow-hidden rounded-xl border border-border"
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
                    <Button
                      render={<Link href={`/listing/${status.id}`} />}
                      className="rounded-xl"
                    >
                      Открыть объявление
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetCreateFlow}
                      className="rounded-xl"
                    >
                      Создать ещё одно
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Title & description */}
          {!showPostPublishPhotos ? (
            <div className="space-y-6">
              <Card className="gap-5 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <FileText size={22} strokeWidth={1.8} aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Описание</h2>
                    <p className="text-xs text-muted-foreground">
                      Чем подробнее — тем быстрее найдётся покупатель
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Название</span>
                      <span
                        className={`text-xs ${
 titleLen < 3 ? 'text-accent' : 'text-muted-foreground'
 }`}
                      >
                        {titleLen} симв. · мин. 3
                      </span>
                    </div>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: iPhone 14 Pro Max 256 ГБ"
                      className="h-12 rounded-xl px-4 text-base"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">Описание</span>
                      <span
                        className={`text-xs ${
 descLen < 10 ? 'text-accent' : 'text-muted-foreground'
 }`}
                      >
                        {descLen} симв. · мин. 10
                      </span>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Состояние, комплект, дефекты, история покупки, способ передачи…"
                      className="min-h-40 rounded-xl px-4 py-3 text-base leading-relaxed"
                    />
                  </label>

                  <div className="rounded-xl bg-primary/10 px-4 py-3 text-xs text-foreground">
                    <span className="font-semibold">Совет: </span>
                    укажите реальное состояние и комплектацию — так меньше вопросов в чате и выше
                    доверие.
                  </div>
                </div>
              </Card>

              <Card className="gap-5 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                    <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Характеристики по категории
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Разделы меняются при смене категории — помогает быстрее найти нужное
                      объявление.
                    </p>
                  </div>
                </div>
                <ListingCategoryAttributesForm
                  sections={attrSections}
                  values={attrValues}
                  onFieldChange={(key, v) =>
                    setAttrValues((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </Card>
            </div>
          ) : (
            <Card className="gap-3 border-secondary/30 bg-secondary/10 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle
                  size={30}
                  strokeWidth={1.8}
                  className="shrink-0 text-secondary"
                  aria-hidden
                />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Объявление опубликовано
                  </h2>
                  <p className="mt-1 text-sm text-foreground/80">
                    Добавьте ещё снимки выше при необходимости — карточка уже видна в поиске.
                  </p>
                  <Link
                    href={`/listing/${status.id}`}
                    className="mt-3 inline-flex text-sm font-semibold text-secondary underline transition-colors hover:text-secondary/80"
                  >
                    Перейти к объявлению →
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="mt-6 space-y-6 lg:mt-0 lg:w-[380px] lg:shrink-0">
          {/* Auth */}
          <Card className="gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserCircle size={22} strokeWidth={1.8} aria-hidden />
              Аккаунт
            </div>
            {me === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="inline-block size-[18px] animate-spin rounded-full border-2 border-primary border-t-transparent"
                  aria-hidden
                />
                Проверяем вход…
              </div>
            ) : me ? (
              <div className="flex items-start gap-3 rounded-xl bg-secondary/10 px-3 py-3 ring-1 ring-secondary/30">
                <CheckCircle
                  size={22}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-secondary"
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">Вы вошли в аккаунт</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {me.name || me.email || me.phone || 'Пользователь'}
                  </div>
                  <Link
                    href="/profile"
                    className="mt-1 inline-block text-xs font-semibold text-secondary underline transition-colors hover:text-secondary/80"
                  >
                    Мой профиль
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-3">
                <p className="text-sm text-foreground">Для публикации нужен вход.</p>
                <Button
                  render={<Link href="/auth" />}
                  size="lg"
                  className="mt-3 h-11 w-full rounded-xl text-sm font-semibold"
                >
                  Войти или зарегистрироваться
                </Button>
              </div>
            )}
          </Card>

          {!showPostPublishPhotos ? (
            <Card className="gap-4 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
                Цена и размещение
              </div>

              <div className="space-y-4">
                <label className="block">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Wallet
                      size={16}
                      strokeWidth={1.8}
                      className="text-muted-foreground"
                      aria-hidden
                    />
                    Цена (₽)
                  </div>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Например: 122000"
                    inputMode="numeric"
                    className="h-12 rounded-xl px-4 text-base"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Оставьте пустым, если цена договорная
                  </p>
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MapPin
                      size={16}
                      strokeWidth={1.8}
                      className="text-muted-foreground"
                      aria-hidden
                    />
                    Город
                  </div>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва"
                    className="h-12 rounded-xl px-4 text-base"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-sm font-medium text-foreground">Категория</div>
                  <UiSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    disabled={loadingCats}
                    options={cats.map((c) => ({ value: c.id, label: c.title }))}
                    className="h-12 rounded-xl border-input bg-background px-3 text-base"
                  />
                </label>
              </div>
            </Card>
          ) : null}

          {status.kind === 'error' ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {status.msg}
            </div>
          ) : null}

          {justPublished ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              Готово! Объявление в ленте. Фото загружаются или уже на месте.
            </div>
          ) : null}

          {!showPostPublishPhotos ? (
            <Button
              type="button"
              size="lg"
              onClick={() => void submit()}
              disabled={busy || uploading || me === 'loading'}
              className="h-14 w-full rounded-2xl text-base font-semibold"
            >
              {busy || uploading ? (
                <>
                  <span
                    className="inline-block size-[22px] animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
                    aria-hidden
                  />
                  {busy ? 'Публикуем…' : 'Загружаем фото…'}
                </>
              ) : (
                'Опубликовать объявление'
              )}
            </Button>
          ) : null}

          {!showPostPublishPhotos ? (
            <p className="text-center text-xs text-muted-foreground">
              Нажимая кнопку, вы подтверждаете корректность данных. При необходимости объявление
              можно изменить в профиле.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
