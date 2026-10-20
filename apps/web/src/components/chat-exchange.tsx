'use client';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Ban, Bell, ChevronLeft, ChevronRight, Clock, Heart, Image as ImageIcon, MoreHorizontal, Package, Repeat2, Search, TriangleAlert, User, X } from 'lucide-react';
import { apiFetchJson, resolveAssetUrl, type ChatMessage, type ChatSummary } from '@/lib/api';
import './chat-exchange.css';

type Item = { listingId: string; ownerId: string; snapshot: { title: string; priceRub: number | null; imageUrl: string | null } };
type Offer = { id: string; senderId: string; recipientId: string; status: string; version: number; cashKopecks: number; terms: string; expiresAt: string; createdAt: string; items: Item[]; confirmations: { userId: string }[] };
type Listing = { id: string; ownerId?: string; title: string; priceRub: number | null; images: { url: string }[] };
type Details = { muted: boolean; blocked: boolean; cannotSend: boolean; listings: Listing[]; favorites: Listing[]; media: { id: string; mediaUrl: string; mediaType: string }[] };
const labels: Record<string, string> = { PENDING: 'Ожидает ответа', ACCEPTED: 'Условия согласованы', DECLINED: 'Отклонено', CANCELLED: 'Отменено', EXPIRED: 'Срок истёк', SUPERSEDED: 'Новые условия', COMPLETED: 'Обмен завершён' };
const money = (n: number | null) => n == null ? 'Цена не указана' : n.toLocaleString('ru-RU') + ' ₽';
function Photo({ url }: { url?: string | null }) {
  const [failed, setFailed] = useState<string>();
  const src = resolveAssetUrl(url);
  // eslint-disable-next-line @next/next/no-img-element
  return src && failed !== src ? <img src={src} alt="" onError={() => setFailed(src)} /> : <Package aria-hidden />;
}
export function ChatExchange({ chat, messages, peerStatus, onOpenMedia, onChanged }: { chat: ChatSummary; messages: ChatMessage[]; peerStatus: string; onChanged: () => void; onOpenMedia: (urls: string[], index: number) => void }) {
  const [, updateAnchors] = useState(0);
  const messageAnchors = messages.map(m => m.id).join(',');
  useLayoutEffect(() => { updateAnchors(n => n + 1); }, [messageAnchors]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [details, setDetails] = useState<Details | null>(null);
  const [screen, setScreen] = useState<'info' | 'search' | 'media' | 'listings' | 'favorites' | 'report' | null>(null);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [choices, setChoices] = useState<Listing[]>([]);
  const [give, setGive] = useState<string[]>([]);
  const [receive, setReceive] = useState<string[]>([]);
  const [direction, setDirection] = useState('none');
  const [cash, setCash] = useState('');
  const [terms, setTerms] = useState('');
  const [days, setDays] = useState('7');
  const [previousId, setPreviousId] = useState<string>();
  const [review, setReview] = useState(false);
  const [notice, setNotice] = useState('');
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const lock = useRef(false);
  const intentOpened = useRef(false);
  const root = `/chats/${encodeURIComponent(chat.id)}`;
  const peerId = chat.peer?.id;
  const refresh = useCallback(async () => {
    const [a, b] = await Promise.all([apiFetchJson<Offer[]>(`${root}/offers`), apiFetchJson<Details>(`${root}/details`)]);
    if (a.ok && Array.isArray(a.data)) setOffers(a.data);
    if (b.ok) setDetails(b.data);
    if (!a.ok || !b.ok) setError('Не удалось загрузить обмены или данные диалога. Повторите попытку.');
    setLoading(false);
  }, [root]);
  useEffect(() => { void refresh(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => {
    const open = () => { setScreen('info'); void refresh(); };
    const update = () => void refresh();
    window.addEventListener('barter-exchange-refresh', update);
    window.addEventListener('barter-chat-details', open);
    return () => { window.removeEventListener('barter-chat-details', open); window.removeEventListener('barter-exchange-refresh', update); };
  }, [refresh]);
  useEffect(() => {
    if (!screen && !form) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.exchange-overlay');
    const first = dialog?.querySelector<HTMLElement>('button, input, a'); first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lock.current) { setScreen(null); setForm(false); }
      if (e.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,select')).filter(n => n.offsetParent !== null);
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); nodes[0]?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [screen, form]);
  async function action(offer: Offer, action: string) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const r = await apiFetchJson<Offer>(`${root}/offers/${offer.id}`, { method: 'POST', body: JSON.stringify({ version: offer.version, action }) });
    if (!r.ok) setError(r.message); else { await refresh(); onChanged(); }
    lock.current = false; setBusy(false);
  }
  async function setting(action: string) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const r = await apiFetchJson<Details>(`${root}/settings`, { method: 'POST', body: JSON.stringify({ action, ...(action === 'report' ? { reason } : {}) }) });
    if (r.ok) { setDetails(r.data); if (action === 'report') { setNotice('Жалоба отправлена в поддержку'); setScreen('info'); setReason(''); } }
    else setError(r.message);
    lock.current = false; setBusy(false);
  }
  async function openForm(offer?: Offer) {
    setError(''); setBusy(true);
    const r = await apiFetchJson<Listing[]>(`${root}/exchange-choices`);
    setBusy(false);
    if (!r.ok) { setError(r.message); return; }
    setChoices(r.data); setPreviousId(offer?.id); setGive(offer?.items.filter(i => i.ownerId !== peerId).map(i => i.listingId) ?? []);
    setReceive(offer?.items.filter(i => i.ownerId === peerId).map(i => i.listingId) ?? (chat.listing && chat.listing.ownerId === peerId ? [chat.listing.id] : []));
    setCash(''); setDirection('none'); setTerms(''); setReview(false); setForm(true); setScreen(null);
  }
  useEffect(() => {
    if (!loading && !intentOpened.current && new URLSearchParams(window.location.search).get('exchange') === '1') {
      intentOpened.current = true;
      void openForm();
    }
    // The chat key remounts this component for a different conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  const amount = direction === 'none' ? 0 : Math.round(Number(cash) * 100) * (direction === 'pay' ? 1 : -1);
  const valid = give.length > 0 && receive.length > 0 && (direction === 'none' || (Number.isFinite(amount) && Math.abs(amount) > 0 && Math.abs(amount) <= 2000000000));
  async function submit() {
    if (!valid || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const payload = JSON.stringify({ giveIds: give, receiveIds: receive, cashKopecks: amount, terms, validDays: Number(days), previousId });
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    const r = await apiFetchJson<Offer>(`${root}/offers`, { method: 'POST', body: JSON.stringify({ ...JSON.parse(payload), clientKey: attempt.current.key }) });
    if (r.ok) { setForm(false); attempt.current = null; await refresh(); onChanged(); } else setError(r.message);
    lock.current = false; setBusy(false);
  }
  function listingRows(list: Listing[]) { return list.length ? list.map(l => <Link className="contact-listing" href={`/listing/${l.id}`} key={l.id}><Photo url={l.images[0]?.url} /><span><b>{l.title}</b><strong>{money(l.priceRub)}</strong></span><ChevronRight /></Link>) : <p className="exchange-empty">Пока ничего нет</p>; }
  function picker(title: string, mine: boolean, ids: string[], set: (v: string[]) => void) {
    const list = choices.filter(l => (l.ownerId !== peerId) === mine);
    return <fieldset><legend>{title}</legend>{list.length ? list.map(l => <label className="exchange-choice" key={l.id}><input type="checkbox" checked={ids.includes(l.id)} onChange={() => set(ids.includes(l.id) ? ids.filter(id => id !== l.id) : [...ids, l.id].slice(0, 10))} /><Photo url={l.images[0]?.url} /><span>{l.title}<b>{money(l.priceRub)}</b></span></label>) : <p>Нет доступных вещей для обмена. {mine && <Link href={`/new?tradeMode=barter`} onClick={() => sessionStorage.setItem('barter-return-chat', chat.id)}>Создать объявление</Link>}</p>}</fieldset>;
  }
  return <div className="chat-exchange">
    {error && !screen && !form ? <div role="alert" className="exchange-error">{error}<button onClick={() => { setError(''); void refresh(); }}>Повторить</button></div> : null}
    {loading ? <p role="status" className="exchange-empty">Загрузка предложений…</p> : null}
    {details?.cannotSend ? <p className="exchange-error">Отправка сообщений недоступна: пользователь заблокирован.</p> : null}
    {chat.listing?.barterEnabled && !details?.cannotSend ? <button className="exchange-start" disabled={busy} onClick={() => void openForm()}><Repeat2 size={19} />Предложить обмен</button> : null}
    {offers.map(offer => {
      const mine = offer.senderId !== peerId;
      const confirmed = offer.confirmations.some(c => c.userId !== peerId);
      const card = <article className="exchange-card" key={offer.id} id={`offer-${offer.id}`}>
        <header><Repeat2 /><h3>Предложение обмена</h3><span className="exchange-status"><Clock size={15} />{labels[offer.status] ?? offer.status}</span></header>
        <div className="exchange-pair">{[true, false].map((own, idx) => <FragmentColumn key={String(own)} arrow={idx === 0}><small>{own ? 'Ваши вещи' : 'Его вещи'}</small>{offer.items.filter(i => (i.ownerId !== peerId) === own).map(i => <Link href={`/listing/${i.listingId}`} className="exchange-item" key={i.listingId}><Photo url={i.snapshot.imageUrl} /><span>{i.snapshot.title}<b>{money(i.snapshot.priceRub)}</b></span></Link>)}</FragmentColumn>)}</div>
        <p className="exchange-terms">{offer.terms || 'Обмен без дополнительных условий'}</p>
        <p className="exchange-money">{offer.cashKopecks === 0 ? 'Без доплаты' : ((offer.cashKopecks > 0) === mine ? 'Вы доплачиваете ' : 'Вам доплачивают ') + money(Math.abs(offer.cashKopecks) / 100)}</p>
        {offer.status === 'PENDING' && !mine ? <div className="exchange-actions" data-pending><button className="exchange-primary" disabled={busy || details?.cannotSend} onClick={() => void action(offer, 'accept')}>Принять условия</button><button disabled={busy} onClick={() => void openForm(offer)}>Предложить новые условия</button><button disabled={busy} onClick={() => void action(offer, 'decline')}>Отклонить</button></div> : null}
        {offer.status === 'PENDING' && mine ? <button className="exchange-secondary" disabled={busy} onClick={() => void action(offer, 'cancel')}>Отозвать предложение</button> : null}
        {offer.status === 'ACCEPTED' ? <div className="exchange-actions"><p>{confirmed ? 'Вы подтвердили передачу. Ожидаем вторую сторону.' : 'Согласуйте встречу в чате. Подтверждайте только после получения вещей.'}</p>{!confirmed && <button className="exchange-primary" disabled={busy} onClick={() => { if (window.confirm('Вы получили все вещи и согласованную доплату? Подтвердить завершение со своей стороны?')) void action(offer, 'confirm'); }}>Я получил вещи</button>}{offer.confirmations.length === 0 ? <button disabled={busy} onClick={() => void action(offer, 'cancel')}>Отменить обмен и снять резерв</button> : <button onClick={() => { setReason('Проблема с обменом ' + offer.id); setScreen('report'); }}>Проблема с передачей</button>}</div> : null}
        {offer.status === 'COMPLETED' && <Link className="exchange-secondary" style={{ display: 'block' }} href={`/listing/${offer.items.find(i => i.ownerId === peerId)?.listingId}`}>Оставить отзыв об обмене</Link>}
        <footer>{new Date(offer.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}{['PENDING', 'ACCEPTED'].includes(offer.status) && <span> · {offer.confirmations.length ? 'Резерв сохраняется до завершения' : `${offer.status === 'ACCEPTED' ? 'Резерв' : 'Действует'} до ${new Date(offer.expiresAt).toLocaleDateString('ru-RU')}`} </span>}</footer>
      </article>;
      const target = typeof document === 'undefined' ? null : document.getElementById(`exchange_offer_${offer.id}`);
      return target ? createPortal(card, target, offer.id) : card;
    })}
    {screen ? <div className="exchange-overlay" role="dialog" aria-modal="true" aria-label="Информация о собеседнике">
      <div className="contact-screen"><header className="contact-toolbar"><button aria-label="Назад к переписке" onClick={() => setScreen(screen === 'info' ? null : 'info')}><ChevronLeft /></button>{screen !== 'info' && <b>{{ search: 'Поиск в переписке', media: 'Файлы и медиа', listings: 'Общие объявления', favorites: 'Моё избранное', report: 'Пожаловаться' }[screen]}</b>}</header>
        {error && <p role="alert" className="exchange-error">{error}</p>}{notice && <p role="status">{notice}</p>}
        {screen === 'info' ? <><div className="contact-identity"><div className="contact-avatar" data-online={peerStatus === 'в сети'}>{chat.peer?.avatarUrl ? <Photo url={chat.peer.avatarUrl} /> : <User aria-hidden />}</div><h2>{chat.peer?.name || 'Собеседник'}</h2><p>{peerStatus}</p></div>
        <div className="contact-shortcuts"><Link href={`/seller/${peerId}`}><User /><span>Профиль</span></Link><button onClick={() => setScreen('search')}><Search /><span>Поиск</span></button><button disabled={busy || !details} onClick={() => void setting(details?.muted ? 'unmute' : 'mute')}><Bell /><span>{details?.muted ? 'Без звука' : 'Уведомления'}</span></button><button onClick={() => document.getElementById('contact-safety')?.scrollIntoView({ behavior: 'smooth' })}><MoreHorizontal /><span>Ещё</span></button></div>
        {chat.listing && listingRows([{ ...chat.listing, images: chat.listing.previewImageUrl ? [{ url: chat.listing.previewImageUrl }] : [] }])}
        <div className="contact-group"><button onClick={() => { setScreen(null); document.getElementById(`offer-${offers.at(-1)?.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} disabled={!offers.length}><Repeat2 /><span><b>Предложения обмена</b><small>{offers.length ? labels[offers.at(-1)!.status] : 'Пока нет предложений'}</small></span><ChevronRight /></button><button onClick={() => setScreen('favorites')}><Heart /><span><b>Моё избранное</b><small>{details?.favorites.length ?? 0} из общих объявлений</small></span><ChevronRight /></button><button onClick={() => setScreen('listings')}><Package /><span><b>Общие объявления</b><small>{details?.listings.length ?? 0} объявления</small></span><ChevronRight /></button><button onClick={() => setScreen('media')}><ImageIcon /><span><b>Файлы и медиа</b><small>{details?.media.length ?? 0} файлов</small></span><ChevronRight /></button><button onClick={() => setScreen('search')}><Search /><span><b>Поиск в переписке</b></span><ChevronRight /></button></div>
        <div className="contact-group contact-danger" id="contact-safety"><button onClick={() => setScreen('report')}><TriangleAlert /><span><b>Пожаловаться</b></span><ChevronRight /></button><button disabled={busy || !details} onClick={() => { if (details?.blocked || window.confirm('Заблокировать пользователя? Он не сможет писать вам и предлагать обмены.')) void setting(details?.blocked ? 'unblock' : 'block'); }}><Ban /><span><b>{details?.blocked ? 'Разблокировать' : 'Заблокировать'}</b></span><ChevronRight /></button></div></> : null}
        {screen === 'search' ? <><input className="exchange-input" autoFocus placeholder="Найти сообщение…" value={search} onChange={e => setSearch(e.target.value)} />{messages.filter(m => search.trim() && m.text.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())).map(m => <div className="contact-search-result" key={m.id}><small>{new Date(m.createdAt).toLocaleString('ru-RU')}</small><p>{m.text}</p></div>)}{search && !messages.some(m => m.text.toLowerCase().includes(search.toLowerCase().trim())) && <p>Ничего не найдено</p>}</> : null}
        {screen === 'listings' && listingRows(details?.listings ?? [])}{screen === 'favorites' && listingRows(details?.favorites ?? [])}
        {screen === 'media' ? <div className="contact-media">{!details?.media.length && <p>Вложений пока нет</p>}{details?.media.map(m => m.mediaType === 'AUDIO' ? <audio key={m.id} src={resolveAssetUrl(m.mediaUrl) ?? ''} controls /> : m.mediaType === 'VIDEO' ? <video key={m.id} src={resolveAssetUrl(m.mediaUrl) ?? ''} controls /> : <button key={m.id} onClick={() => { const photos = details.media.filter(x => x.mediaType === 'IMAGE'); onOpenMedia(photos.map(x => resolveAssetUrl(x.mediaUrl)!), photos.findIndex(x => x.id === m.id)); }}><Photo url={m.mediaUrl} /></button>)}</div> : null}
        {screen === 'report' ? <><p>Опиши, что произошло. В поддержку попадут причина и номер диалога.</p><textarea className="exchange-input" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Причина жалобы" /><button className="exchange-primary" disabled={busy || !reason.trim()} onClick={() => void setting('report')}>Отправить жалобу</button></> : null}
      </div></div> : null}
    {form ? <div className="exchange-overlay" role="dialog" aria-modal="true" aria-label="Предложить обмен"><div className="contact-screen exchange-form"><header className="contact-toolbar"><button disabled={busy} onClick={() => setForm(false)} aria-label="Закрыть"><X /></button><h2>{review ? 'Проверьте предложение' : 'Предложить обмен'}</h2></header>{error && <p role="alert" className="exchange-error">{error}</p>}
      {review ? <><h3>Вы предлагаете</h3>{listingRows(choices.filter(l => give.includes(l.id)))}<h3>Вы получаете</h3>{listingRows(choices.filter(l => receive.includes(l.id)))}<p><b>{amount === 0 ? 'Без доплаты' : (amount > 0 ? 'Вы доплачиваете ' : 'Вам доплачивают ') + money(Math.abs(amount) / 100)}</b></p><p>{terms || 'Без дополнительных условий'}</p><p>Срок предложения: {days} дн.</p><p>Принятие резервирует вещи на 7 дней. Завершение подтверждает каждый участник после передачи. Деньги через площадку не переводятся.</p><button disabled={busy} className="exchange-primary" onClick={() => void submit()}>{busy ? 'Отправляем…' : 'Отправить предложение'}</button><button disabled={busy} className="exchange-secondary" onClick={() => setReview(false)}>Изменить</button></> : <>{picker('Вы предлагаете', true, give, setGive)}{picker('Вы получаете', false, receive, setReceive)}<label>Доплата<select value={direction} onChange={e => setDirection(e.target.value)}><option value="none">Без доплаты</option><option value="pay">Я доплачу</option><option value="receive">Хочу доплату</option></select></label>{direction !== 'none' && <label>Сумма, ₽<input type="number" min="0.01" max="20000000" step="0.01" value={cash} onChange={e => setCash(e.target.value)} /></label>}<label>Условия встречи или передачи<textarea value={terms} maxLength={2000} onChange={e => setTerms(e.target.value)} placeholder="Например, встреча в Краснодаре, район Авроры" /></label><label>Срок предложения<select value={days} onChange={e => setDays(e.target.value)}>{[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} дн.</option>)}</select></label><button className="exchange-primary" disabled={!valid} onClick={() => setReview(true)}>Проверить предложение</button></>}
    </div></div> : null}
  </div>;
}
function FragmentColumn({ children, arrow }: { children: React.ReactNode; arrow: boolean }) { return <div className="exchange-column">{children}{arrow && <ArrowRight className="exchange-arrow" size={20} />}</div>; }
