import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(process.env.BARTER_BROWSER_TOOLS, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const server = spawn(process.execPath, [resolve(root, '../../node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3203'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', b => process.stderr.write(b));
const output = resolve(root, 'test-results/exchange'); await mkdir(output, { recursive: true });
let browser;
try {
  for (let i=0;i<60;i++) { try { if ((await fetch('http://localhost:3203/messages')).ok) break; } catch {} await new Promise(r=>setTimeout(r,500)); }
  browser = await chromium.launch({ ...(process.env.BARTER_CHROMIUM_PATH ? { executablePath: process.env.BARTER_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {}) });
  for (const theme of ['light','dark']) for (const width of [393,430]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme: theme });
    await context.addInitScript(theme => { localStorage.setItem('barter_token', 'isolated-exchange-fixture'); localStorage.setItem('barter_theme_pref', theme.toUpperCase()); }, theme);
    const listing = { id: 'iphone', title: 'iPhone 15 Pro 256GB', ownerId: 'peer', priceRub: 65000, previewImageUrl: 'http://localhost:3203/demo-exchange/iphone.jpg', images: [{ url:'http://localhost:3203/demo-exchange/iphone.jpg' }], saleEnabled: true, barterEnabled: true, city: 'Краснодар' };
    const laptop = { id:'macbook', ownerId:'me', title:'MacBook Air M2', priceRub:70000, images:[{url:'http://localhost:3203/demo-exchange/macbook.jpg'}] };
    const chat = { id:'demo', listing, peer: {id:'peer',name:'Александр'}, myRole:'buyer', unreadCount:0, updatedAt:new Date().toISOString() };
    const messages = [{id:'voice',text:'Голосовое сообщение',mediaType:'AUDIO',mediaUrl:'http://localhost:3203/fixture-voice.wav',senderId:'peer',sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString()},{id:'welcome',text:'Здравствуйте! Можно обсудить обмен?',senderId:'peer',sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString()}];
    let offers = [{ id:'first',senderId:'peer',recipientId:'me',status:'PENDING',version:1,cashKopecks:0,terms:'Предлагаю обмен, как думаете?',expiresAt:new Date(Date.now()+86400000).toISOString(),createdAt:new Date().toISOString(),confirmations:[],items:[{listingId:'iphone',ownerId:'peer',snapshot:{title:listing.title,priceRub:65000,imageUrl:listing.previewImageUrl}},{listingId:'macbook',ownerId:'me',snapshot:{title:laptop.title,priceRub:70000,imageUrl:laptop.images[0].url}}]}];
    messages.push({ id:'exchange_offer_first', text:'Предложение обмена', senderId:'peer', sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString() });
    const details = {muted:false,blocked:false,cannotSend:false,listings:[listing,laptop],favorites:[listing],media:[]};
    const writes=[];
    const wav=Buffer.alloc(44+16000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);for(let n=0;n<16000;n++)wav.writeInt16LE(Math.round(Math.sin(n*.08)*6000*Math.sin(n/16000*Math.PI)),44+n*2);
    await context.route('**/fixture-voice.wav',route=>route.fulfill({contentType:'audio/wav',body:wav}));
    await context.routeWebSocket(/.*/, socket=>socket.close());
    await context.route(url => url.hostname !== 'localhost' || url.pathname.startsWith('/api/backend/') || url.pathname==='/auth/me' || url.pathname==='/chats' || url.pathname.startsWith('/socket.io'), async route=>{
      const req=route.request(),url=new URL(req.url());
      const path=url.pathname.replace(/^\/api\/backend/,'');
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.hostname!=='localhost') return route.abort();
      if(path==='/auth/me')return json({id:'me',name:'Максим',appTheme:theme.toUpperCase()});
      if(path==='/chats')return json([chat]);
      if(path==='/chats/demo/messages')return json(messages);
      if(path==='/chats/demo/details')return json(details);
      if(path==='/chats/demo/exchange-choices')return json([listing,laptop]);
      if(path==='/chats/demo/settings'){const body=req.postDataJSON();writes.push(body);if(body.action==='mute')details.muted=true;if(body.action==='block'){details.blocked=true;details.cannotSend=true;}return json(details);}
      if(path==='/chats/demo/offers'&&req.method()==='GET')return json(offers);
      if(path==='/chats/demo/offers'&&req.method()==='POST'){writes.push(req.postDataJSON());return json({...offers[0],id:'second'});}
      if(path==='/chats/demo/offers/first'){const body=req.postDataJSON();writes.push(body);offers=[{...offers[0],status:body.action==='accept'?'ACCEPTED':'DECLINED',version:2}];return json(offers[0]);}
      if(path==='/support/advise')return json({tip:null,suggestions:[]});
      if(path==='/support/templates'||path==='/support/faq')return json([]);
      return json({},404);
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3203/messages?chatId=demo');
    await expect(page.getByText('Предлагаю обмен, как думаете?')).toBeVisible();
    await expect(page.locator('.chat-audio-wave span')).toHaveCount(36);
    await page.getByRole('button',{name:'Воспроизвести голосовое сообщение',exact:true}).click();
    await expect(page.getByRole('button',{name:'Приостановить голосовое сообщение',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Приостановить голосовое сообщение',exact:true}).click();
    await page.locator('.exchange-card').scrollIntoViewIfNeeded();
    await expect(page.locator('.exchange-card img').first()).toHaveJSProperty('naturalWidth', 1000);
    await page.screenshot({path:join(output,`offer-${width}-${theme}.png`)});
    await page.getByRole('button',{name:'Действия с перепиской'}).click();
    await expect(page.getByRole('heading',{name:'Александр'})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:join(output,`contact-${width}-${theme}.png`)});
    await page.getByRole('button',{name:'Уведомления',exact:true}).click();
    await expect(page.getByRole('button',{name:'Без звука',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Поиск в переписке',exact:true}).click();
    await page.getByPlaceholder('Найти сообщение…').fill('обсудить');
    await expect(page.locator('.contact-search-result')).toHaveCount(1);
    await page.getByRole('button',{name:'Назад к переписке'}).click();
    await page.getByRole('button',{name:'Назад к переписке'}).click();
    await page.getByRole('button',{name:'Предложить обмен',exact:true}).click();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button',{name:'Проверить предложение'}).click();
    await expect(page.getByText('Деньги через площадку не переводятся.',{exact:false})).toBeVisible();
    await page.screenshot({path:join(output,`review-${width}-${theme}.png`)});
    await page.getByRole('button',{name:'Отправить предложение',exact:true}).click();
    const sent=writes.find(w=>w.clientKey);assert.deepEqual(sent.giveIds,['macbook']);assert.deepEqual(sent.receiveIds,['iphone']);assert.equal(sent.cashKopecks,0);
    await page.getByRole('button',{name:'Обсудить условия',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Обсудить условия',exact:true})).toBeVisible();
    assert.equal(writes.some(w=>w.action==='accept'),false);
    await page.getByRole('button',{name:'Принять условия',exact:true}).click();
    await expect(page.getByRole('button',{name:'Я получил вещи',exact:true})).toBeVisible();
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(`PASS ${width} ${theme}: exchange review, send, accept, details, search, mute; screenshots captured`);
    await context.close();
  }
} finally { await browser?.close();server.kill('SIGTERM'); }
