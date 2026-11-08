/* Idempotent, explicitly labelled demo marketplace fixtures.
 * Run from apps/api: node scripts/seed-match-demo.cjs
 * Write requires APPLY_DEMO_SEED=1. Production additionally requires
 * ALLOW_PUBLIC_DEMO_SEED=1. Never seed private/restricted real accounts.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { buildAlbums } = require('./commons-demo-photos.cjs');
const slugOrder = ['electronics','hobby','home','clothes','kids'];
const offerings = [
  ['iPhone 13 128 ГБ', 29000], ['PlayStation 5 Digital', 38000],
  ['MacBook Air M1', 48000], ['Nintendo Switch OLED', 22000],
  ['Робот-пылесос Xiaomi', 14000], ['Кофемашина DeLonghi', 16000],
  ['Куртка кожаная, M', 10000], ['Кроссовки New Balance, 42', 8500],
  ['Коляска 2 в 1', 18000], ['Детский велосипед', 12000],
  ['Samsung Galaxy S22', 25000], ['Xbox Series S', 21000],
  ['Пылесос Dyson V8', 23000], ['Пальто шерстяное, L', 13000],
  ['Автокресло детское', 11000], ['iPad 9 64 ГБ', 19000],
  ['Геймпад DualSense', 6500], ['Микроволновая печь LG', 8000],
  ['Кроссовки Adidas, 43', 7000], ['Детская кроватка', 9500],
  ['Google Pixel 7', 23000], ['Игровой монитор 27 дюймов', 18000],
  ['Мультиварка Redmond', 5000], ['Рюкзак городской', 4500],
  ['Самокат детский', 4200], ['iPhone SE 2022', 16000],
  ['Игровая клавиатура', 5000], ['Блендер Braun', 6000],
  ['Пуховик зимний, M', 9000], ['Детский стульчик для кормления', 5500],
];
const names = ['Алексей', 'Марина', 'Игорь', 'Елена', 'Денис',
  'Светлана', 'Павел', 'Кристина', 'Роман', 'Ольга',
  'Артём', 'Виктория', 'Никита', 'Дарья', 'Сергей'];
const categoryFor = index => slugOrder[index % slugOrder.length];
async function main() {
  const production = process.env.NODE_ENV === 'production';
  if (production && process.env.ALLOW_PUBLIC_DEMO_SEED !== '1') {
    throw new Error('Production demo seeding blocked: set ALLOW_PUBLIC_DEMO_SEED=1 only after deliberate approval.');
  }
  if (process.env.APPLY_DEMO_SEED !== '1') {
    console.log('DRY RUN: 15 DEMO profiles, 30 DEMO listings. Set APPLY_DEMO_SEED=1 to write.');
    return;
  }
  const categories = await prisma.category.findMany({ where: { slug: { in: slugOrder } },
    select: { slug: true, id: true } });
  const ids = new Map(categories.map(row => [row.slug,row.id]));
  const missing = slugOrder.filter(slug => !ids.has(slug));
  if (missing.length) throw new Error('Missing required category slugs: ' + missing.join(', '));
  // Original SVG demo art is self-hosted, versioned with the web application.
  // Never fake photos of merchandise we do not own.
  const origin = process.env.DEMO_ASSET_ORIGIN || 'https://web-one-blond-66.vercel.app';
  const albums = process.env.DEMO_IMAGE_MODE === 'illustration'
    ? offerings.map((offering, index) => [1,2].map(view => ({
        url: origin + '/demo-art/' + (index+1) + '/' + view,
        source: origin + '/demo-art/' + (index+1) + '/' + view,
        author:'Barter',license:'Original illustration',
        title:'Демо-иллюстрация: ' + offering[0] + ', ракурс ' + view,
      })))
    : await buildAlbums(2);
  if(albums.length!==30 || albums.some(album=>album.length<2 ||
      album.some(photo=>!photo.url.startsWith('https://'))))
    throw new Error('Incomplete demo albums. Database unchanged.');
  console.log('Prepared',albums.length,'demo albums, first:',
    albums[0].map(photo=>photo.url).join(', '));
  let count = 0;
  await prisma.$transaction(async tx => {
  for (let i=0; i<15; i++) {
    // Invalid reserved domain: cannot be mistaken for a real person's inbox.
    const email = 'match-demo-' + String(i+1).padStart(2,'0') + '@example.invalid';
    const user = await tx.user.upsert({
      where: {email},
      create: {email, name: 'ДЕМО · ' + names[i], about: 'Тестовый профиль Barter. Объявления не являются реальными предложениями.'},
      update: {name: 'ДЕМО · ' + names[i], about: 'Тестовый профиль Barter. Объявления не являются реальными предложениями.'},
    });
    for (let j=0; j<2; j++) {
      const k=i*2+j, [title, priceRub] = offerings[k];
      // Every counterpart category appears in a concrete wanted list; anyOffer allows wider discovery.
      const theirIndex = i === 14 ? 0 : (i % 2 === 0 ? i + 1 : i - 1);
      const wantSlug = categoryFor(theirIndex*2 + j);
      const exchangePreferences = {
        anyOffer: true, wantedCategoryIds: [ids.get(wantSlug)],
        wantedDescription: 'Рассмотрю обмен на ' + (offerings[theirIndex*2+j][0]),
        canAddCash: true, acceptsCash: true, maxCashRub: 20000,
        handoffMethods: ['MEETING', 'DELIVERY'],
      };
      const id = 'barter-demo-match-20261108-' + String(k+1).padStart(2,'0');
      const data = {
        title: '[ДЕМО] ' + title,
        description: 'ТЕСТОВОЕ ОБЪЯВЛЕНИЕ. Товар вымышленный, не продаётся и не обменивается. Фотографии иллюстрируют тип товара, могут не соответствовать конкретной модели или комплектации и не отражают реальное состояние. Для проверки Barter Match.\\n\\n' +
          'Иллюстрации, источники и авторы:\\n' +
          albums[k].map((photo,index)=>(index+1)+'. '+photo.author+' · '+photo.license+' · '+photo.source).join('\\n'),
        priceRub, city: 'Краснодар', saleEnabled: j===0, barterEnabled: true,
        exchangePreferences, categoryId: ids.get(categoryFor(k)), ownerId: user.id,
        status: 'ACTIVE', attributes: { isDemo: true, isBarter: true,
          demoPhotoCredits: albums[k].map(({source,author,license,title})=>({source,author,license,title})) },
      };
      await tx.listing.upsert({where:{id},create:{id,...data},update:data});
      // Only manage fixture images; do not delete real user uploads.
      await tx.listingImage.deleteMany({where:{listingId:id}});
      await tx.listingImage.createMany({data:albums[k].map((photo,sortOrder)=>({
        listingId:id,sortOrder,url:photo.url,
      }))});
      count++;
    }
  }
  }, { timeout: 45000 });
  console.log('Created/updated 15 labelled DEMO users and ' + count + ' DEMO listings with verified source galleries.');
  console.log('If Meilisearch is enabled, run the existing active-listing reindex job.');
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>prisma.$disconnect());
