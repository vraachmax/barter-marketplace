'use client';

/**
 * /new — Avito-style wizard для размещения объявления (Hotfix #13).
 *
 * Раньше /new был «всё-на-одной-странице»: фото + название + описание +
 * характеристики + цена/город/категория в сайдбаре. На мобильном это давало
 * длинный скролл и пугало пустой <select> категории. Теперь — пошаговый
 * визард, как у Avito:
 *
 *   1. «Что продаёте?» — один большой input. Под ним live-подсказки
 *      категорий (локальный fuzzy-match по title/keywords, без AI/сети).
 *   2. «Категория и описание» — подтверждение категории + цена + описание
 *      + характеристики.
 *   3. «Фото» — drag-n-drop, до 10 снимков. Первое = обложка.
 *   4. «Где?» — город размещения.
 *   5. «Готово» — auth-check + кнопка «Опубликовать».
 *
 * Прогресс-бар сверху, кнопки «Назад/Далее» снизу. На мобильном bottom-nav
 * sticky, на desktop — обычная карточка max-w-2xl.
 *
 * Палитра: только `--mode-accent*` и `--mode-cta` (никаких brand-токенов
 * `bg-primary` / `text-primary` / `text-accent` — иначе синие пятна на
 * оранжевой Бартер-теме).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  MapPin,
  PlusCircle,
  Search,
  Tag,
  UserCircle,
  Wallet,
  X,
} from 'lucide-react';
import {
  API_URL,
  apiFetchJson,
  apiGetJson,
  apiUploadImage,
  type AuthMe,
  type Category,
} from '@/lib/api';
import ListingCategoryAttributesForm from '@/components/listing-category-attributes-form';
import {
  getListingAttrSectionsForCategorySlug,
  serializeListingAttributes,
} from '@/lib/listing-attributes-config';
import { Button } from '@/components/ui/button';
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

/* ============================================================================
 *  ЛОКАЛЬНЫЙ FUZZY MATCH (без AI, без сети)
 *
 *  Словарь ключевых слов для каждой категории. Алгоритм:
 *   1. Точное вхождение query в название категории → 100 очков.
 *   2. Каждое keyword, входящее в query → 50 очков + 2*len(keyword) (длиннее
 *      ключ — выше уверенность).
 *   3. Сортировка по убыванию очков, top-4.
 *
 *  Ключевые слова покрывают популярные товары (айфон, диван, велосипед, …)
 *  + бренды (Apple, Samsung, BMW, Лада, …) + лексика домена (квартира,
 *  работа, услуги). Список не претендует на полноту, дополняется по
 *  обратной связи Максима.
 * ========================================================================== */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  auto: [
    'авто', 'автомобиль', 'машин', 'тачк', 'легков',
    'lada', 'лада', 'веста', 'гранта', 'приора', 'нива',
    'bmw', 'бмв', 'audi', 'ауди', 'mercedes', 'мерседес', 'мерс',
    'toyota', 'тойот', 'kia', 'киа', 'hyundai', 'хендай', 'хундай',
    'volkswagen', 'фольксваген', 'volvo', 'вольво', 'skoda', 'шкода',
    'ford', 'форд', 'renault', 'рено', 'peugeot', 'пежо',
    'мотоцикл', 'скутер', 'мопед', 'квадроцикл', 'снегоход',
    'грузовик', 'газель', 'камаз',
  ],
  realty: [
    'квартир', 'комнат', 'студи', 'апартамент',
    'дом', 'дач', 'коттедж', 'участок', 'земл',
    'гараж', 'машиномест', 'парков',
    'аренда', 'снять', 'сдам', 'сдаю', 'сдаются',
    'продажа', 'продам квартиру', 'купить квартиру',
    '1-комн', '2-комн', '3-комн', 'однушк', 'двушк', 'трешк',
  ],
  job: [
    'работа', 'вакансия', 'требуется', 'ищу сотрудник', 'найм', 'найму',
    'грузчик', 'курьер', 'продавец', 'кассир', 'оператор',
    'программист', 'разработчик', 'developer', 'дизайнер',
    'водитель', 'таксист', 'охранник', 'администратор',
    'менеджер', 'консультант', 'бухгалтер',
  ],
  services: [
    'услуг', 'ремонт', 'мастер', 'починю', 'починка',
    'сантехник', 'электрик', 'плиточник', 'маляр', 'плотник',
    'клининг', 'уборка', 'химчистк',
    'репетитор', 'обучение', 'курсы',
    'грузоперевозк', 'переезд',
    'парикмахер', 'маникюр', 'педикюр', 'массаж',
    'фотограф', 'видеограф', 'свадебн',
    'юрист', 'адвокат', 'консультац',
  ],
  electronics: [
    'iphone', 'айфон', 'apple', 'эпл', 'macbook', 'мак', 'ipad', 'айпад',
    'samsung', 'самсунг', 'galaxy', 'xiaomi', 'сяоми', 'ксиаоми', 'redmi', 'редми',
    'huawei', 'хуавей', 'honor', 'хонор', 'realme',
    'смартфон', 'телефон', 'мобильник',
    'ноутбук', 'laptop', 'компьютер', 'pc', 'пк', 'системник',
    'монитор', 'клавиатура', 'мышь', 'мышка', 'роутер', 'wi-fi',
    'наушники', 'airpods', 'аирподс', 'колонка', 'колонки', 'jbl',
    'tv', 'телевизор', 'led', 'oled',
    'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'свич', 'switch',
    'фотоаппарат', 'камера', 'gopro', 'гопро',
    'часы', 'apple watch', 'смарт-часы',
  ],
  home: [
    'диван', 'кресл', 'кровать', 'матрас', 'тумб', 'комод',
    'шкаф', 'гардероб', 'стол', 'стул', 'табурет',
    'мебель', 'кухонн', 'обеденн',
    'плита', 'духов', 'микровол', 'свч', 'мультиварк',
    'холодильник', 'морозильник',
    'стиральн', 'сушильн', 'посудомоечн',
    'пылесос', 'утюг', 'вентилятор', 'обогреватель',
    'лампа', 'светильник', 'люстра',
    'ковер', 'штор', 'плед',
    'инструмент', 'дрель', 'болгарка', 'перфоратор', 'шуруповерт',
    'газонокосилк', 'триммер', 'мангал',
  ],
  clothes: [
    'куртк', 'пуховик', 'пальто', 'плащ', 'шуба',
    'платье', 'юбка', 'блузк', 'рубашк',
    'джинс', 'брюки', 'штаны', 'шорт',
    'футболк', 'майк', 'свитер', 'кофт', 'худи', 'толстовк',
    'обувь', 'кеды', 'кроссовк', 'ботинк', 'сапог', 'туфл',
    'сумка', 'рюкзак', 'кошелек', 'кошелёк',
    'шапка', 'шарф', 'перчатк', 'кепка',
    'nike', 'adidas', 'zara', 'h&m', 'uniqlo', 'reserved',
  ],
  kids: [
    'коляск', 'автокресл', 'манеж', 'кроватк', 'детск',
    'игрушк', 'конструктор', 'lego', 'лего',
    'пазл', 'кукла', 'машинк', 'мягк',
    'самокат', 'беговел', 'скейт',
    'распашонк', 'комбинезон', 'ползунк', 'боди',
    'подгузник', 'смесь', 'бутылочк', 'соск',
  ],
  hobby: [
    'велосипед', 'байк', 'мтб',
    'гитара', 'пианино', 'синтезатор', 'барабан', 'микрофон',
    'книга', 'учебник', 'атлас',
    'настольн', 'игра', 'манчкин', 'монополи',
    'спорт', 'гантел', 'штанга', 'тренажер',
    'лыжи', 'сноуборд', 'коньки',
    'удочк', 'рыбал', 'спиннинг',
    'палатк', 'спальник', 'рюкзак туристический',
  ],
};

function fuzzyMatchCategory(query: string, cats: Category[]): Category[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const scores = new Map<string, number>();
  for (const c of cats) {
    if (c.title.toLowerCase().includes(q)) {
      scores.set(c.id, (scores.get(c.id) ?? 0) + 100);
    }
    const kws = CATEGORY_KEYWORDS[c.slug] ?? [];
    for (const kw of kws) {
      if (q.includes(kw)) {
        scores.set(c.id, (scores.get(c.id) ?? 0) + 50 + kw.length * 2);
      }
    }
  }
  return cats
    .filter((c) => scores.has(c.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, 4);
}

/* ============================================================================
 *  WIZARD
 * ========================================================================== */
type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Что продаёте?',
  2: 'Категория и описание',
  3: 'Фотографии',
  4: 'Где находится',
  5: 'Готово к публикации',
};

const TOTAL_STEPS = 5;

export default function NewListingPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [me, setMe] = useState<AuthMe | null | 'loading'>('loading');

  const [step, setStep] = useState<WizardStep>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [city, setCity] = useState('Москва');
  const [categoryId, setCategoryId] = useState<string>('');
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    { kind: 'idle' } | { kind: 'error'; msg: string } | { kind: 'ok'; id: string }
  >({ kind: 'idle' });
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string }>>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(pendingPhotos);
  pendingRef.current = pendingPhotos;

  /* -------------------- data load -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGetJson<Category[]>('/categories');
        if (!alive) return;
        setCats(data);
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

  /* -------------------- derived -------------------- */
  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  const attrSections = useMemo(
    () => getListingAttrSectionsForCategorySlug(selectedCategory?.slug ?? ''),
    [selectedCategory],
  );

  const serializedAttributes = useMemo(
    () => serializeListingAttributes(attrSections, attrValues),
    [attrSections, attrValues],
  );

  /** Live-подсказки на step 1 — обновляются каждый ввод. */
  const titleSuggestions = useMemo(
    () => fuzzyMatchCategory(title, cats),
    [title, cats],
  );

  const totalPhotos = pendingPhotos.length + uploadedImages.length;

  /* -------------------- helpers -------------------- */
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

  /** Проверка можно ли нажать «Далее» на текущем шаге. */
  function canGoNext(s: WizardStep): boolean {
    if (s === 1) return titleLen >= 3 && categoryId.length > 0;
    if (s === 2) return descLen >= 10;
    if (s === 3) return true; // фото — необязательно
    if (s === 4) return city.trim().length >= 2;
    if (s === 5) return me !== 'loading' && me !== null;
    return false;
  }

  function nextStepHint(s: WizardStep): string {
    if (s === 1 && titleLen < 3) return 'Введите хотя бы 3 символа';
    if (s === 1 && !categoryId) return 'Выберите категорию из подсказок';
    if (s === 2 && descLen < 10) return 'Описание: минимум 10 символов';
    if (s === 4 && city.trim().length < 2) return 'Укажите город';
    if (s === 5 && me === null) return 'Войдите, чтобы опубликовать';
    return '';
  }

  function goNext() {
    if (!canGoNext(step)) return;
    if (step < TOTAL_STEPS) setStep(((step as number) + 1) as WizardStep);
  }
  function goBack() {
    if (step > 1) setStep(((step as number) - 1) as WizardStep);
  }

  /* -------------------- photos -------------------- */
  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setPendingPhotos((prev) => {
      const slotsLeft = Math.max(0, 10 - (prev.length + uploadedImages.length));
      const taking = imageFiles.slice(0, slotsLeft);
      const next = taking.map((file) => ({
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

  /* -------------------- submit -------------------- */
  function validate(): string | null {
    if (payload.title.length < 3) return 'Название: минимум 3 символа';
    if (payload.description.length < 10) return 'Описание: минимум 10 символов';
    if (payload.city.length < 2) return 'Город: минимум 2 символа';
    if (!payload.categoryId) return 'Выберите категорию';
    return null;
  }

  async function submit() {
    const validationError = validate();
    if (validationError) {
      setSubmitStatus({ kind: 'error', msg: validationError });
      return;
    }
    setBusy(true);
    setSubmitStatus({ kind: 'idle' });
    const photosSnapshot = [...pendingPhotos];
    const res = await apiFetchJson<{ id: string }>('/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 401) {
        setSubmitStatus({
          kind: 'error',
          msg: 'Нужно войти в аккаунт, чтобы опубликовать объявление.',
        });
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
        setSubmitStatus({ kind: 'error', msg: friendly });
      }
      return;
    }
    const id = res.data?.id;
    if (id) {
      setSubmitStatus({ kind: 'ok', id });
      if (photosSnapshot.length > 0) {
        await uploadPendingToListing(id, photosSnapshot);
      }
    } else setSubmitStatus({ kind: 'error', msg: 'created_but_no_id' });
  }

  function resetCreateFlow() {
    revokePending(pendingPhotos);
    setPendingPhotos([]);
    setUploadedImages([]);
    setSubmitStatus({ kind: 'idle' });
    setAttrValues({});
    setTitle('');
    setDescription('');
    setPrice('');
    setCategoryId('');
    setStep(1);
  }

  /* ============================================================================
   *  RENDER
   * ========================================================================== */
  // Post-publish экран — показываем вместо мастера.
  if (submitStatus.kind === 'ok') {
    return <PostPublishScreen
      listingId={submitStatus.id}
      uploadedImages={uploadedImages}
      pendingPhotos={pendingPhotos}
      uploading={uploading}
      onUploadMore={async (files) => {
        if (!files || submitStatus.kind !== 'ok') return;
        setUploading(true);
        for (const file of Array.from(files)) {
          const res = await apiUploadImage(`/listings/${submitStatus.id}/images`, file);
          if (res.ok) {
            setUploadedImages((prev) => [
              ...prev,
              { id: res.data.id as string, url: res.data.url as string },
            ]);
          }
        }
        setUploading(false);
      }}
      onResetFlow={resetCreateFlow}
    />;
  }

  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      {/* ===== HEADER + PROGRESS ===== */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-muted"
              aria-label="Назад"
            >
              <ChevronLeft size={22} strokeWidth={1.8} className="shrink-0" aria-hidden />
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-muted"
              aria-label="На главную"
            >
              <X size={22} strokeWidth={1.8} className="shrink-0" aria-hidden />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Шаг {step} из {TOTAL_STEPS}
            </p>
            <h1 className="truncate text-base font-bold text-foreground">{STEP_LABELS[step]}</h1>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <div
                key={n}
                className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: n <= step ? '100%' : '0%',
                    backgroundColor: 'var(--mode-accent)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ===== STEP CONTENT ===== */}
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5 md:pb-24 md:pt-8">
        {step === 1 ? (
          <Step1WhatToSell
            title={title}
            onTitleChange={setTitle}
            suggestions={titleSuggestions}
            allCats={cats}
            categoryId={categoryId}
            onCategoryPick={setCategoryId}
            loadingCats={loadingCats}
          />
        ) : null}

        {step === 2 ? (
          <Step2Description
            title={title}
            selectedCategory={selectedCategory}
            description={description}
            onDescriptionChange={setDescription}
            descLen={descLen}
            price={price}
            onPriceChange={setPrice}
            attrSections={attrSections}
            attrValues={attrValues}
            onAttrChange={(key, v) =>
              setAttrValues((prev) => ({ ...prev, [key]: v }))
            }
            onChangeCategoryClick={() => setStep(1)}
          />
        ) : null}

        {step === 3 ? (
          <Step3Photos
            pendingPhotos={pendingPhotos}
            totalPhotos={totalPhotos}
            dragOver={dragOver}
            onDragEnterCapture={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(files) => {
              setDragOver(false);
              addFiles(files);
            }}
            onPickFiles={(files) => addFiles(files)}
            onRemovePending={removePending}
            fileInputRef={fileInputRef}
          />
        ) : null}

        {step === 4 ? (
          <Step4Location city={city} onCityChange={setCity} />
        ) : null}

        {step === 5 ? (
          <Step5Confirm
            title={title}
            selectedCategory={selectedCategory}
            description={description}
            price={price}
            city={city}
            totalPhotos={totalPhotos}
            me={me}
            submitStatus={submitStatus}
          />
        ) : null}
      </main>

      {/* ===== BOTTOM ACTION BAR ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="h-12 rounded-xl px-4 text-sm font-semibold"
            >
              Назад
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext(step)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--mode-accent)',
                  boxShadow: canGoNext(step) ? '0 4px 14px var(--mode-accent-ring)' : 'none',
                }}
              >
                Далее
                <ChevronRight size={18} strokeWidth={2} className="shrink-0" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy || uploading || !canGoNext(5)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--mode-cta)',
                  boxShadow: '0 4px 14px var(--mode-accent-ring)',
                }}
              >
                {busy || uploading ? (
                  <>
                    <span
                      className="inline-block size-[18px] shrink-0 animate-spin rounded-full border-2 border-t-transparent"
                      style={{ borderColor: 'rgba(255,255,255,0.55)', borderTopColor: 'transparent' }}
                      aria-hidden
                    />
                    {busy ? 'Публикуем…' : 'Загружаем фото…'}
                  </>
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.2} className="shrink-0" aria-hidden />
                    Опубликовать
                  </>
                )}
              </button>
            )}
            {nextStepHint(step) ? (
              <p className="mt-1 text-center text-[11px] text-muted-foreground">
                {nextStepHint(step)}
              </p>
            ) : null}
            {submitStatus.kind === 'error' ? (
              <p className="mt-1 text-center text-[11px] text-destructive">
                {submitStatus.msg}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 *  STEP COMPONENTS
 * ========================================================================== */

function Step1WhatToSell(props: {
  title: string;
  onTitleChange: (v: string) => void;
  suggestions: Category[];
  allCats: Category[];
  categoryId: string;
  onCategoryPick: (id: string) => void;
  loadingCats: boolean;
}) {
  const { title, onTitleChange, suggestions, allCats, categoryId, onCategoryPick, loadingCats } = props;
  const [showAll, setShowAll] = useState(false);
  return (
    <section className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Введите название — мы подберём категорию автоматически.
      </p>

      <div className="relative">
        <Search
          size={20}
          strokeWidth={1.8}
          className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <Input
          autoFocus
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="iPhone 14 Pro Max 256 ГБ"
          className="h-14 rounded-2xl pl-11 pr-12 text-base"
        />
        {title.length > 0 ? (
          <button
            type="button"
            onClick={() => onTitleChange('')}
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70"
            aria-label="Очистить"
          >
            <X size={14} strokeWidth={2} className="shrink-0" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Live-подсказки */}
      {suggestions.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Подходящие категории
          </p>
          <ul className="grid gap-2">
            {suggestions.map((c) => {
              const isPicked = c.id === categoryId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onCategoryPick(c.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition"
                    style={
                      isPicked
                        ? {
                            borderColor: 'var(--mode-accent)',
                            backgroundColor: 'var(--mode-accent-soft)',
                          }
                        : { borderColor: 'var(--border)' }
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                        style={{ backgroundColor: 'var(--mode-accent)' }}
                      >
                        <Tag size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{c.title}</span>
                    </span>
                    {isPicked ? (
                      <Check
                        size={20}
                        strokeWidth={2.2}
                        className="shrink-0"
                        style={{ color: 'var(--mode-accent)' }}
                        aria-hidden
                      />
                    ) : (
                      <ChevronRight
                        size={18}
                        strokeWidth={2}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Все категории — fallback если ничего не подошло */}
      <details
        open={showAll || (title.trim().length >= 2 && suggestions.length === 0)}
        onToggle={(e) => setShowAll((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-border bg-card"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <LayoutGrid size={16} strokeWidth={2} className="shrink-0" aria-hidden />
            Выбрать вручную
          </span>
          <ChevronRight
            size={16}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground transition-transform"
            style={{ transform: showAll ? 'rotate(90deg)' : 'none' }}
            aria-hidden
          />
        </summary>
        {loadingCats ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Загружаем категории…</p>
        ) : (
          <ul className="grid gap-1 border-t border-border p-2">
            {allCats.map((c) => {
              const isPicked = c.id === categoryId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => props.onCategoryPick(c.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
                    style={
                      isPicked
                        ? {
                            backgroundColor: 'var(--mode-accent-soft)',
                            color: 'var(--mode-accent)',
                            fontWeight: 700,
                          }
                        : undefined
                    }
                  >
                    <span>{c.title}</span>
                    {isPicked ? (
                      <Check
                        size={16}
                        strokeWidth={2.2}
                        className="shrink-0"
                        style={{ color: 'var(--mode-accent)' }}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </section>
  );
}

function Step2Description(props: {
  title: string;
  selectedCategory: Category | null;
  description: string;
  onDescriptionChange: (v: string) => void;
  descLen: number;
  price: string;
  onPriceChange: (v: string) => void;
  attrSections: ReturnType<typeof getListingAttrSectionsForCategorySlug>;
  attrValues: Record<string, string>;
  onAttrChange: (key: string, v: string) => void;
  onChangeCategoryClick: () => void;
}) {
  const {
    title,
    selectedCategory,
    description,
    onDescriptionChange,
    descLen,
    price,
    onPriceChange,
    attrSections,
    attrValues,
    onAttrChange,
    onChangeCategoryClick,
  } = props;
  return (
    <section className="space-y-6">
      {/* Selected title + category */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Объявление
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-bold text-foreground">{title}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--mode-accent-soft)',
              color: 'var(--mode-accent)',
            }}>
            <Tag size={12} strokeWidth={2.2} className="shrink-0" aria-hidden />
            {selectedCategory?.title ?? 'Без категории'}
          </span>
          <button
            type="button"
            onClick={onChangeCategoryClick}
            className="text-xs font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--mode-accent)' }}
          >
            Изменить
          </button>
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Wallet size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden />
          Цена (₽)
        </label>
        <Input
          value={price}
          onChange={(e) => onPriceChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Например: 122 000"
          inputMode="numeric"
          className="h-12 rounded-xl px-4 text-base"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Оставьте пустым, если цена договорная
        </p>
      </div>

      {/* Description */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileText size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden />
            Описание
          </label>
          <span
            className="text-xs"
            style={
              descLen < 10
                ? { color: 'var(--mode-accent)' }
                : { color: 'var(--muted-foreground)' }
            }
          >
            {descLen} симв. · мин. 10
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Состояние, комплект, дефекты, история покупки, способ передачи…"
          className="min-h-32 rounded-xl px-4 py-3 text-base leading-relaxed"
        />
        <div
          className="mt-2 rounded-xl px-4 py-3 text-xs text-foreground"
          style={{ backgroundColor: 'var(--mode-accent-soft)' }}
        >
          <span className="font-semibold">Совет: </span>
          укажите состояние и комплектацию — меньше вопросов в чате.
        </div>
      </div>

      {/* Attributes */}
      {attrSections.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="grid size-9 place-items-center rounded-xl text-white"
              style={{ backgroundColor: 'var(--mode-accent)' }}
            >
              <LayoutGrid size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Характеристики</h2>
              <p className="text-[11px] text-muted-foreground">
                Помогает быстрее найти ваше объявление в поиске
              </p>
            </div>
          </div>
          <ListingCategoryAttributesForm
            sections={attrSections}
            values={attrValues}
            onFieldChange={onAttrChange}
          />
        </div>
      ) : null}
    </section>
  );
}

function Step3Photos(props: {
  pendingPhotos: PendingPhoto[];
  totalPhotos: number;
  dragOver: boolean;
  onDragEnterCapture: () => void;
  onDragLeave: () => void;
  onDrop: (files: FileList | null) => void;
  onPickFiles: (files: FileList | null) => void;
  onRemovePending: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const {
    pendingPhotos,
    totalPhotos,
    dragOver,
    onDragEnterCapture,
    onDragLeave,
    onDrop,
    onPickFiles,
    onRemovePending,
    fileInputRef,
  } = props;
  const slotsLeft = Math.max(0, 10 - totalPhotos);
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        До 10 фото. Первое — обложка в ленте. Чем чётче снимки — тем выше доверие.
      </p>

      <div
        role="button"
        tabIndex={0}
        onDragEnter={(e) => {
          e.preventDefault();
          onDragEnterCapture();
        }}
        onDragLeave={onDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition"
        style={{
          borderColor: dragOver ? 'var(--mode-accent)' : 'var(--border)',
          backgroundColor: dragOver ? 'var(--mode-accent-soft)' : 'transparent',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = '';
          }}
          disabled={slotsLeft === 0}
        />
        <PlusCircle
          size={44}
          strokeWidth={1.8}
          className="shrink-0"
          style={{ color: 'var(--mode-accent)' }}
          aria-hidden
        />
        <p className="mt-3 text-center text-sm font-bold text-foreground">
          {slotsLeft === 0 ? 'Достигнут лимит 10 фото' : 'Перетащите или выберите'}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          JPG, PNG, WEBP · {totalPhotos}/10
        </p>
        {slotsLeft > 0 ? (
          <span
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--mode-accent)' }}
          >
            <PlusCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden />
            Добавить
          </span>
        ) : null}
      </div>

      {pendingPhotos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {pendingPhotos.map((p, idx) => (
            <li
              key={p.id}
              className="listing-thumb-wrap group relative aspect-square overflow-hidden rounded-xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="listing-thumb-img h-full w-full object-cover" />
              {idx === 0 ? (
                <span
                  className="absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--mode-accent)' }}
                >
                  обложка
                </span>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePending(p.id);
                }}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/55 text-white opacity-100 transition hover:bg-black/75"
                aria-label="Удалить фото"
              >
                <X size={12} strokeWidth={2.2} className="shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Step4Location(props: { city: string; onCityChange: (v: string) => void }) {
  const { city, onCityChange } = props;
  return (
    <section className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Город нужен, чтобы покупатели поблизости видели ваше объявление первыми.
      </p>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MapPin size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden />
          Город
        </label>
        <Input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Например: Москва"
          className="h-12 rounded-xl px-4 text-base"
          autoFocus
        />
      </div>
      <div
        className="rounded-xl px-4 py-3 text-xs text-foreground"
        style={{ backgroundColor: 'var(--mode-accent-soft)' }}
      >
        Можно указать любой город России. Точный адрес остаётся приватным —
        делитесь только при договорённости в чате.
      </div>
    </section>
  );
}

function Step5Confirm(props: {
  title: string;
  selectedCategory: Category | null;
  description: string;
  price: string;
  city: string;
  totalPhotos: number;
  me: AuthMe | null | 'loading';
  submitStatus: { kind: 'idle' } | { kind: 'error'; msg: string } | { kind: 'ok'; id: string };
}) {
  const { title, selectedCategory, description, price, city, totalPhotos, me } = props;
  return (
    <section className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Проверьте данные и нажмите «Опубликовать». Вы сможете отредактировать
        объявление в любой момент.
      </p>

      {/* Account */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UserCircle size={20} strokeWidth={1.8} className="shrink-0" aria-hidden />
          Аккаунт
        </div>
        {me === 'loading' ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="inline-block size-[18px] shrink-0 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--mode-accent-ring)', borderTopColor: 'transparent' }}
              aria-hidden
            />
            Проверяем вход…
          </div>
        ) : me ? (
          <div
            className="mt-3 flex items-start gap-3 rounded-xl px-3 py-3 ring-1"
            style={{
              backgroundColor: 'var(--mode-accent-soft)',
              ['--tw-ring-color' as string]: 'var(--mode-accent-ring)',
            }}
          >
            <CheckCircle
              size={22}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
              style={{ color: 'var(--mode-accent)' }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Вы вошли в аккаунт</div>
              <div className="truncate text-xs text-muted-foreground">
                {me.name || me.email || me.phone || 'Пользователь'}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3">
            <p className="text-sm text-foreground">Войдите, чтобы опубликовать объявление.</p>
            <Link
              href="/auth"
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-white transition"
              style={{ backgroundColor: 'var(--mode-accent)' }}
            >
              Войти или зарегистрироваться
            </Link>
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Что публикуем
        </p>
        <p className="mt-1 text-base font-bold text-foreground">{title || '—'}</p>
        {price ? (
          <p
            className="mt-1 text-xl font-bold"
            style={{ color: 'var(--mode-accent)' }}
          >
            {Number(price).toLocaleString('ru-RU')} ₽
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Цена договорная</p>
        )}
        <ul className="mt-3 space-y-2 text-sm">
          <SummaryRow label="Категория" value={selectedCategory?.title ?? '—'} />
          <SummaryRow label="Город" value={city} />
          <SummaryRow label="Фото" value={`${totalPhotos} шт.`} />
          <SummaryRow label="Описание" value={`${description.trim().length} симв.`} />
        </ul>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-0 first:pt-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-foreground">{value}</span>
    </li>
  );
}

/* ============================================================================
 *  POST-PUBLISH SCREEN
 *  Показывается после успешной публикации. Позволяет догрузить фото и
 *  перейти к карточке объявления.
 * ========================================================================== */
function PostPublishScreen(props: {
  listingId: string;
  uploadedImages: Array<{ id: string; url: string }>;
  pendingPhotos: PendingPhoto[];
  uploading: boolean;
  onUploadMore: (files: FileList | null) => Promise<void>;
  onResetFlow: () => void;
}) {
  const { listingId, uploadedImages, uploading, onUploadMore, onResetFlow } = props;
  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      <header className="border-b border-border bg-background px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:[color:var(--mode-accent)]"
          >
            <ChevronLeft size={20} strokeWidth={1.8} className="shrink-0" aria-hidden />
            На главную
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--mode-accent-soft)' }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle
              size={32}
              strokeWidth={1.8}
              className="shrink-0"
              style={{ color: 'var(--mode-accent)' }}
              aria-hidden
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">Объявление опубликовано</h1>
              <p className="mt-1 text-sm text-foreground/80">
                Карточка уже видна в поиске. Можно догрузить ещё фото или перейти к объявлению.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/listing/${listingId}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--mode-accent)' }}
                >
                  Открыть объявление
                  <ChevronRight size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={onResetFlow}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted/50"
                >
                  <PlusCircle size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                  Создать ещё
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload more */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold text-foreground">Дополнительные фото</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Можно догрузить снимки уже после публикации.
          </p>
          <label
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition"
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => void onUploadMore(e.target.files)}
            />
            <PlusCircle
              size={36}
              strokeWidth={1.8}
              className="shrink-0"
              style={{ color: 'var(--mode-accent)' }}
              aria-hidden
            />
            <span className="mt-2 text-sm font-bold text-foreground">Добавить ещё фото</span>
            <span className="text-xs text-muted-foreground">
              {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файлы'}
            </span>
          </label>
          {uploadedImages.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
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
        </div>
      </main>
    </div>
  );
}
