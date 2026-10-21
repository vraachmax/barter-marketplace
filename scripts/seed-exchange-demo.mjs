// Explicitly invoked through the normal authenticated API, never during deployment.
// BARTER_API_URL=https://... DEMO_PASSWORD=<private password> node scripts/seed-exchange-demo.mjs
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base = process.env.BARTER_API_URL?.replace(/\/$/, '');
const password = process.env.DEMO_PASSWORD;
if (!base || !password || password.length < 16) throw new Error('Set BARTER_API_URL and a private DEMO_PASSWORD (16+ characters).');
async function api(path, token, body, method = 'POST') {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
const categories = await api('/categories', null, undefined, 'GET');
const flat = list => list.flatMap(c => [c, ...flat(c.children ?? [])]);
const all = flat(Array.isArray(categories) ? categories : categories.items ?? []);
const electronics = all.find(c => c.slug === 'electronics');
const phoneCategory = all.find(c => /smartphone|mobile.phone|телефон|смартфон/i.test(c.slug + ' ' + c.title)) ?? electronics;
const laptopCategory = all.find(c => /laptop|ноутбук/i.test(c.slug + ' ' + c.title)) ?? electronics;
if (!phoneCategory || !laptopCategory) throw new Error('Resolve phone and laptop categories before seeding.');
const specs = [
 { email: 'exchange-alexander@example.test', name: 'Александр · тестовый аккаунт', title: 'iPhone 15 Pro 256 ГБ · тестовое объявление', categoryId: phoneCategory.id, priceRub: 65000, photo: 'iphone.jpg', source: 'StorresJayrMx, https://unsplash.com/photos/8GR3wQ8pUEE', description: 'Учебный сценарий: iPhone 15 Pro 256 ГБ, натуральный титан, в чехле. В примере комплект с кабелем и коробкой, без ремонта. Интересен обмен на ноутбук, доплату обсудим. Краснодар, район Авроры.' },
 { email: 'exchange-maxim@example.test', name: 'Максим · тестовый аккаунт', title: 'MacBook Air M2 8/256 ГБ · тестовое объявление', categoryId: laptopCategory.id, priceRub: 70000, photo: 'macbook.jpg', source: 'James Yarema, https://unsplash.com/photos/6M9bAK5l4_o', description: 'Учебный сценарий: MacBook Air M2, 13,6 дюйма, 8/256 ГБ. В примере используется дома для работы, зарядка в комплекте. Интересен iPhone 15 Pro, готов обсудить обмен при встрече в Краснодаре.' },
];
const accounts = [];
for (const spec of specs) {
  let auth;
  try { auth = await api('/auth/login', null, { email: spec.email, password }); }
  catch (e) { if (!String(e).includes('401')) throw e; auth = await api('/auth/register', null, { email: spec.email, password }); }
  await api('/auth/me', auth.token, { name: spec.name }, 'PATCH');
  const mine = await api('/listings/my', auth.token, undefined, 'GET');
  let listing = (Array.isArray(mine) ? mine : mine.items ?? []).find(l => l.title === spec.title);
  if (!listing) listing = await api('/listings', auth.token, {
    title: spec.title, categoryId: spec.categoryId, priceRub: spec.priceRub, city: 'Краснодар', saleEnabled: true, barterEnabled: true,
    description: `ТЕСТОВОЕ ОБЪЯВЛЕНИЕ БАРТЕРА. Товар не продаётся, денег не переводить. Для проверки переписки и обменов.\n\n${spec.description}\n\nИллюстративное фото: ${spec.source}, Unsplash License. Параметры и история вещи являются тестовыми данными.`,
    exchangePreferences: { anyOffer: true, wantedCategoryIds: [], wantedDescription: 'Для проверки обмена между телефоном и ноутбуком', canAddCash: true, acceptsCash: true, maxCashRub: null },
  });
  const current = await api(`/listings/${listing.id}`, auth.token, undefined, 'GET');
  if (!current.images?.length) {
    const form = new FormData();
    form.append('image', new Blob([await readFile(new URL('../apps/web/public/demo-exchange/' + spec.photo, import.meta.url))], { type: 'image/jpeg' }), spec.photo);
    const upload = await fetch(`${base}/listings/${listing.id}/images`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body: form });
    if (!upload.ok) throw new Error(`Image upload failed: ${upload.status}`);
  }
  accounts.push({ ...spec, token: auth.token, listingId: listing.id });
}
const [alex, max] = accounts;
const chat = await api(`/chats/by-listing/${alex.listingId}`, max.token, {});
const history = await api(`/chats/${chat.id}/messages`, max.token, undefined, 'GET');
if (!history.length) {
  await api(`/chats/${chat.id}/messages`, max.token, { text: 'Привет! Это тестовый диалог. Предлагаю MacBook в обмен на iPhone, можем проверить условия и доплату.', clientMessageId: randomUUID() });
  await api(`/chats/${chat.id}/messages`, alex.token, { text: 'Да, давайте проверим. Перед подтверждением посмотрим итоговые условия обмена.', clientMessageId: randomUUID() });
}
const offers = await api(`/chats/${chat.id}/offers`, max.token, undefined, 'GET');
if (!offers.length) await api(`/chats/${chat.id}/offers`, max.token, { clientKey: randomUUID(), giveIds: [max.listingId], receiveIds: [alex.listingId], cashKopecks: 0, terms: 'Тестовый обмен. Встреча у Авроры, осмотр обоих устройств. Реальной передачи вещей и денег нет.', validDays: 7 });
console.log(JSON.stringify({ chatId: chat.id, accounts: accounts.map(a => ({ email: a.email, name: a.name, listingId: a.listingId })) }, null, 2));
