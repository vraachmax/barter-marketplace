import { behaviorRequestHeaders } from './behavior-context';

/** Нормализация localhost → 127.0.0.1 (Windows / IPv6). */
function normalizeApiOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const t = url.replace(/\/+$/, '');
  return t.replace(/^http:\/\/localhost(?=:)/i, 'http://127.0.0.1');
}

const explicitApiUrl = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL);
const isServer = typeof window === 'undefined';

/** Локальный API: 127.0.0.1, не localhost — иначе на Windows Node fetch часто бьёт в ::1, Nest на IPv4 → ECONNREFUSED / «fetch failed» */
const LOCAL_API_ORIGIN = 'http://127.0.0.1:3001';

// For local/dev without explicit public API URL:
// - server components call local API directly
// - browser calls same-origin paths (works behind reverse proxy/tunnel)
export const API_URL = explicitApiUrl ?? (isServer ? LOCAL_API_ORIGIN : '');
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const localhostBrowser = browserHost === 'localhost' || browserHost === '127.0.0.1';
export const SOCKET_URL = explicitApiUrl ?? (isServer || localhostBrowser ? LOCAL_API_ORIGIN : '');

export type Category = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
};

export type ListingCard = {
  id: string;
  title: string;
  priceRub: number | null;
  /** per_day, per_hour, per_service, per_sqm, per_month, negotiable, null = обычная */
  priceType?: string | null;
  city: string;
  createdAt: string;
  category: { id: string; title: string };
  owner?: { id: string; name: string | null };
  images?: ListingImage[];
  promoType?: 'TOP' | 'VIP' | 'XL' | null;
  promoEndsAt?: string | null;
  /** Активное поднятие (TOP/XL) в ранжировании ленты */
  isBoosted?: boolean;
  /** Активный VIP (отдельная полоса сверху, не дублируется в основной ленте) */
  isVip?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** Расстояние до точки поиска (sort=nearby), км */
  distanceKm?: number;
};

export type ListingImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type AuthMe = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  about: string | null;
  companyName: string | null;
  companyInfo: string | null;
  showEmailPublic: boolean;
  showPhonePublic: boolean;
  appTheme: 'SYSTEM' | 'LIGHT' | 'DARK';
  notificationsEnabled: boolean;
  marketingEnabled: boolean;
  createdAt: string;
};

export type FavoriteItem = {
  id: string;
  createdAt: string;
  listing: ListingCard;
};

export type ChatSummary = {
  id: string;
  updatedAt: string;
  unreadCount: number;
  listing: {
    id: string;
    title: string;
    priceRub: number | null;
    city: string;
    previewImageUrl?: string | null;
  } | null;
  peer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  isReadByPeer?: boolean;
  /** Сообщение от бота-помощника площадки */
  isAssistant?: boolean;
  mediaUrl?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO' | null;
  sender: {
    id: string;
    name: string | null;
  };
};

export type ReviewEligibility = {
  canReview: boolean;
  reason:
    | 'ok'
    | 'listing_not_found'
    | 'is_owner'
    | 'already_reviewed'
    | 'no_chat'
    | 'need_mutual_messages';
  sellerId?: string;
  hasExistingReview?: boolean;
};

export type MyListing = {
  id: string;
  title: string;
  priceRub: number | null;
  city: string;
  createdAt: string;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED' | 'SOLD' | 'ARCHIVED';
  duplicateImageFlag?: boolean;
  /** Характеристики из формы размещения (JSON) */
  attributes?: Record<string, unknown> | null;
  category: { id: string; title: string };
  images?: ListingImage[];
  activePromotion: {
    type: 'TOP' | 'VIP' | 'XL';
    endsAt: string;
  } | null;
};

export type SellerProfileResponse = {
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    about: string | null;
    companyName: string | null;
    companyInfo: string | null;
    createdAt: string;
  };
  rating: {
    avg: number | null;
    count: number;
  };
  reviews: Array<{
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    author: { id: string; name: string | null };
    listing: { id: string; title: string };
  }>;
  activeListings: Array<{
    id: string;
    title: string;
    priceRub: number | null;
    city: string;
    createdAt: string;
    category: { id: string; title: string };
    images: ListingImage[];
  }>;
};

export type MyReviewsResponse = {
  given: Array<{
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    listing: { id: string; title: string };
    seller: { id: string; name: string | null };
  }>;
  received: Array<{
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    listing: { id: string; title: string };
    author: { id: string; name: string | null };
  }>;
};

// ==================== Wallet / Pricing types ====================
export type PromotionAudience = 'PERSONAL' | 'BUSINESS';
export type PromotionTypeCode = 'TOP' | 'VIP' | 'XL' | 'COLOR' | 'LIFT';
export type WalletTxnType =
  | 'TOPUP'
  | 'PROMOTION'
  | 'PRO_SUBSCRIPTION'
  | 'REFUND'
  | 'BONUS'
  | 'ADJUSTMENT';

export type WalletBalance = {
  balanceRub: number;
  balanceKopecks: number;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  createdAt: string;
  amountRub: number;
  amountKopecks: number;
  balanceAfterRub: number;
  type: WalletTxnType;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  description: string;
  promotion: {
    id: string;
    type: PromotionTypeCode;
    endsAt: string;
    listing: { id: string; title: string };
  } | null;
  proSubscription: {
    id: string;
    endsAt: string;
    plan: { code: string; title: string };
  } | null;
};

export type PromotionPackage = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  audience: PromotionAudience;
  promotionType: PromotionTypeCode;
  weightMultiplier: number;
  durationSec: number;
  priceRub: number;
  priceKopecks: number;
  isBundle: boolean;
  sortOrder: number;
};

export type ProPlan = {
  id: string;
  code: string;
  title: string;
  listingsLimit: number | null;
  priceRubPerMonth: number;
  priceKopecksPerMonth: number;
};

export type ProSubscription = {
  id: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
  autoRenew: boolean;
  startsAt: string;
  endsAt: string;
  plan: {
    code: string;
    title: string;
    listingsLimit: number | null;
    priceRubPerMonth: number;
  };
};

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch (e) {
    const hint =
      API_URL && !explicitApiUrl
        ? ` Проверьте, что API запущен (npm run dev:api) и порт 3001 свободен.`
        : '';
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Сеть: не удалось запросить ${url}. ${msg}.${hint}`);
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return (await res.json()) as T;
}

function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('barter_token'); } catch { return null; }
}

export async function apiFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const token = getClientToken();
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...behaviorRequestHeaders(),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let message = `API ${res.status}`;
      try {
        const body = (await res.json()) as any;
        message = formatApiErrorMessage(body?.message, message);
      } catch {
        // ignore
      }
      return { ok: false, status: res.status, message };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message ?? 'network_error' };
  }
}

function formatApiErrorMessage(raw: unknown, fallback: string): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map(String).join('; ');
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const m = (raw as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export async function apiUploadImage(
  path: string,
  file: File,
): Promise<{ ok: true; data: any } | { ok: false; status: number; message: string }> {
  try {
    const fd = new FormData();
    fd.append('image', file);
    const token = getClientToken();
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers: {
        ...authHeaders,
        ...behaviorRequestHeaders(),
      },
    });
    if (!res.ok) {
      let message = `API ${res.status}`;
      try {
        const body = (await res.json()) as any;
        message = formatApiErrorMessage(body?.message, message);
      } catch {
        // ignore
      }
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: await res.json() };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message ?? 'network_error' };
  }
}

export async function apiUploadFile(
  path: string,
  file: File,
  fieldName = 'file',
  extraFields?: Record<string, string>,
): Promise<{ ok: true; data: any } | { ok: false; status: number; message: string }> {
  try {
    const fd = new FormData();
    fd.append(fieldName, file);
    for (const [k, v] of Object.entries(extraFields ?? {})) {
      fd.append(k, v);
    }
    const token = getClientToken();
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers: {
        ...authHeaders,
        ...behaviorRequestHeaders(),
      },
    });
    if (!res.ok) {
      let message = `API ${res.status}`;
      try {
        const body = (await res.json()) as any;
        message = formatApiErrorMessage(body?.message, message);
      } catch {
        // ignore
      }
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: await res.json() };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message ?? 'network_error' };
  }
}

