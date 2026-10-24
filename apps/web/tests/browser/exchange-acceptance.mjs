import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(process.env.BARTER_BROWSER_TOOLS, 'package.json'));
const { chromium, webkit, expect } = require('@playwright/test');
const webRequire = createRequire(resolve(root, 'package.json'));
const sharp = webRequire('sharp');
const jsQR = webRequire('jsqr');
const engine = process.env.BARTER_BROWSER_ENGINE === 'webkit' ? 'webkit' : 'chromium';
const server = spawn(process.execPath, [resolve(root, '../../node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3203'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', b => process.stderr.write(b));
const output = resolve(root, 'test-results/exchange', engine); await mkdir(output, { recursive: true });
let browser;
try {
  for (let i=0;i<60;i++) { try { if ((await fetch('http://localhost:3203/messages')).ok) break; } catch {} await new Promise(r=>setTimeout(r,500)); }
  browser = await (engine === 'webkit' ? webkit : chromium).launch({ ...(engine === 'chromium' && process.env.BARTER_CHROMIUM_PATH ? { executablePath: process.env.BARTER_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {}) });
  for (const theme of ['light','dark']) for (const width of [393,430]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme: theme, isMobile: engine === 'webkit', hasTouch: engine === 'webkit' });
    await context.addInitScript(theme => { localStorage.setItem('barter_token', 'isolated-exchange-fixture'); localStorage.setItem('barter_theme_pref', theme.toUpperCase()); }, theme);
    const listing = { id: 'iphone', title: 'iPhone 15 Pro 256GB', ownerId: 'peer', priceRub: 65000, previewImageUrl: 'http://localhost:3203/demo-exchange/iphone.jpg', images: [{ url:'http://localhost:3203/demo-exchange/iphone.jpg' }], saleEnabled: true, barterEnabled: true, exchangePreferences:{handoffMethods:['MEETING','DELIVERY']}, city: 'Краснодар' };
    const laptop = { id:'macbook', ownerId:'me', title:'MacBook Air M2', priceRub:70000, exchangePreferences:{handoffMethods:['MEETING','DELIVERY']}, images:[{url:'http://localhost:3203/demo-exchange/macbook.jpg'}] };
    const chat = { id:'demo', listing, peer: {id:'peer',name:'Александр'}, myRole:'buyer', unreadCount:0, updatedAt:new Date().toISOString() };
    const messages = [{id:'voice',text:'Голосовое сообщение',mediaType:'AUDIO',mediaUrl:'http://localhost:3203/fixture-voice.wav',senderId:'peer',sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString()},{id:'welcome',text:'Здравствуйте! Можно обсудить обмен?',senderId:'peer',sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString()}];
    messages.push({id:'voice-outgoing',text:'Голосовое сообщение',mediaType:'AUDIO',mediaUrl:'http://localhost:3203/fixture-voice.wav',senderId:'me',sender:{id:'me',name:'Максим'},createdAt:new Date().toISOString()});
    let offers = [{ id:'first',senderId:'peer',recipientId:'me',status:'PENDING',version:1,handoffMethod:'MEETING',cashKopecks:0,terms:'Предлагаю обмен, как думаете?',expiresAt:new Date(Date.now()+86400000).toISOString(),createdAt:new Date().toISOString(),confirmations:[],items:[{listingId:'iphone',ownerId:'peer',snapshot:{title:listing.title,priceRub:65000,imageUrl:listing.previewImageUrl}},{listingId:'macbook',ownerId:'me',snapshot:{title:laptop.title,priceRub:70000,imageUrl:laptop.images[0].url}}]}];
    messages.push({ id:'exchange_offer_first', text:'Предложение обмена', senderId:'peer', sender:{id:'peer',name:'Александр'},createdAt:new Date().toISOString() });
    const details = {muted:false,blocked:false,cannotSend:false,listings:[listing,laptop],favorites:[listing],media:[]};
    const writes=[];
    const wav=Buffer.alloc(44+16000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);for(let n=0;n<16000;n++)wav.writeInt16LE(Math.round(Math.sin(n*.08)*6000*Math.sin(n/16000*Math.PI)*(0.25+0.75*Math.pow(Math.max(0,Math.sin(n/16000*Math.PI*10+0.3)),1.25))),44+n*2);
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
      if(path==='/chats/demo/offers/first/confirmation-qr')return json({code:'BX1.first.1792700000.'+'b'.repeat(64),expiresAt:new Date(Date.now()+120000).toISOString()});
      if(path==='/chats/demo/offers/first/shipment'){
        const payload=req.postDataJSON();writes.push({shipment:payload});
        offers=[{...offers[0],shipping:{...(offers[0].shipping||{}),recipient:{...payload,submittedAt:new Date().toISOString()}}}];
        return json(offers[0]);
      }
      if(path==='/chats/demo/offers'&&req.method()==='POST'){writes.push(req.postDataJSON());return json({...offers[0],id:'second'});}
      if(path==='/chats/demo/offers/first'){const body=req.postDataJSON();writes.push(body);offers=[{...offers[0],status:body.action==='accept'?'ACCEPTED':body.action==='confirm'?'COMPLETED':'DECLINED',version:body.action==='accept'?2:4,confirmations:body.action==='confirm'?[{userId:'peer'},{userId:'me'}]:offers[0].confirmations}];return json(offers[0]);}
      if(path==='/support/advise')return json({tip:null,suggestions:[]});
      if(path==='/support/templates'||path==='/support/faq')return json([]);
      return json({},404);
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3203/messages?chatId=demo');
    await expect(page.getByText('Предлагаю обмен, как думаете?')).toBeVisible();
    await expect(page.locator('.chat-audio-wave span')).toHaveCount(72);
    const incomingVoice=page.locator('.chat-audio[data-direction="incoming"]');
    const outgoingVoice=page.locator('.chat-audio[data-direction="outgoing"]');
    await expect(incomingVoice).toBeVisible();
    await expect(outgoingVoice).toBeVisible();
    const appearance=await outgoingVoice.evaluate(player=>{
      const shell=player.closest('.message-bubble'),meta=shell?.querySelector('[data-message-meta]');
      const rect=player.getBoundingClientRect();
      return {height:rect.height,background:getComputedStyle(player).backgroundColor,
        shellBackground:shell?getComputedStyle(shell).backgroundColor:'',
        timestampBelow:Boolean(meta&&meta.getBoundingClientRect().top>=rect.bottom)};
    });
    assert.equal(appearance.background,'rgb(255, 100, 21)');
    assert.equal(appearance.shellBackground,'rgba(0, 0, 0, 0)');
    assert.ok(appearance.height>=69 && appearance.height<=78,JSON.stringify(appearance));
    assert.ok(appearance.timestampBelow);
    const footerGeometry=await outgoingVoice.evaluate(player=>{
      const duration=player.querySelector('.chat-audio-time')?.getBoundingClientRect();
      const speed=player.querySelector('.chat-audio-speed')?.getBoundingClientRect();
      const track=player.querySelector('.chat-audio-track')?.getBoundingClientRect();
      return {height:duration?.height ?? 0, durationRight:duration?.right ?? 0,
        speedLeft:speed?.left ?? 0, speedRight:speed?.right ?? 0, trackRight:track?.right ?? 0};
    });
    const alignment=await outgoingVoice.evaluate(player=>{
      const rect=(selector)=>player.querySelector(selector)?.getBoundingClientRect();
      const bubble=player.getBoundingClientRect();
      const play=rect('.chat-audio-toggle');
      const track=rect('.chat-audio-track');
      const footer=rect('.chat-audio-footer');
      const speed=rect('.chat-audio-speed');
      return {
        bubbleCenter:bubble.top + bubble.height / 2,
        playCenter:play ? play.top + play.height / 2 : -1,
        waveCenter:track ? track.top + track.height / 2 : -1,
        footerTop:footer?.top ?? -1,
        waveBottom:track?.bottom ?? -1,
        playLeft:play?.left ?? -1,
        waveLeft:track?.left ?? -1,
        waveRight:track?.right ?? -1,
        speedRight:speed?.right ?? -1,
        containerLeft:bubble.left,
        containerRight:bubble.right,
      };
    });
    for (const [direction, voice] of [['outgoing', outgoingVoice], ['incoming', incomingVoice]]) {
      const glyph = await voice.evaluate(player => {
        const button = player.querySelector('.chat-audio-toggle')?.getBoundingClientRect();
        const ring = player.querySelector('.chat-audio-play-ring')?.getBoundingClientRect();
        if (!button || !ring) return null;
        return {
          dx: (ring.left + ring.width / 2) - (button.left + button.width / 2),
          dy: (ring.top + ring.height / 2) - (button.top + button.height / 2),
          ringWidth: ring.width,
          buttonWidth: button.width,
        };
      });
      assert.ok(glyph && Math.abs(glyph.dx) <= 0.6 && Math.abs(glyph.dy) <= 0.6,
        `The white Play ring must be centered in the orange circle (${direction}): ${JSON.stringify(glyph)}`);
    }
    assert.ok(Math.abs(alignment.playCenter-alignment.bubbleCenter)<=1,
      'Play must be vertically centered in the entire orange voice bubble: '+JSON.stringify(alignment));
    assert.ok(Math.abs(alignment.waveCenter-alignment.playCenter)<=1,
      'Play and the waveform must share the same horizontal centerline: '+JSON.stringify(alignment));
    assert.ok(Math.abs(alignment.waveCenter-alignment.bubbleCenter)<=1,
      'Waveform must be vertically centered in the entire voice bubble: '+JSON.stringify(alignment));
    assert.ok(alignment.footerTop > alignment.playCenter,
      'Time and speed belong below the shared visual axis: '+JSON.stringify(alignment));
    assert.ok(alignment.footerTop>=alignment.waveBottom,
      'Time and speed must form a separate row below the waveform: '+JSON.stringify(alignment));
    assert.ok(alignment.playLeft>alignment.containerLeft && alignment.waveLeft>alignment.playLeft,
      'Player controls must remain within two aligned columns: '+JSON.stringify(alignment));
    assert.ok(alignment.speedRight<=alignment.containerRight,
      'Speed must remain inside the message: '+JSON.stringify(alignment));
    assert.ok(footerGeometry.height<=20, 'Duration must remain on one line: '+JSON.stringify(footerGeometry));
    assert.ok(footerGeometry.speedLeft>footerGeometry.durationRight,
      'Speed and time should be in opposite footer columns: '+JSON.stringify(footerGeometry));
    assert.ok(Math.abs(footerGeometry.speedRight-footerGeometry.trackRight)<=8,
      'Speed must align with the end of the waveform: '+JSON.stringify(footerGeometry));
    const peakHeights=await outgoingVoice.locator('.chat-audio-wave span').evaluateAll(nodes=>
      nodes.map(node=>node.getBoundingClientRect().height));
    assert.ok(Math.max(...peakHeights)-Math.min(...peakHeights)>8,
      'The decoded voice waveform should retain audible dynamics');
    await expect(outgoingVoice.getByRole('button',{name:'Скорость воспроизведения 1×. Изменить скорость'})).toBeVisible();
    await outgoingVoice.getByRole('button',{name:'Скорость воспроизведения 1×. Изменить скорость'}).click();
    await expect(outgoingVoice.getByRole('button',{name:'Скорость воспроизведения 1.5×. Изменить скорость'})).toBeVisible();
    assert.equal(await outgoingVoice.locator('audio').evaluate(node=>node.playbackRate),1.5);
    await outgoingVoice.getByRole('button',{name:'Скорость воспроизведения 1.5×. Изменить скорость'}).click();
    assert.equal(await outgoingVoice.locator('audio').evaluate(node=>node.playbackRate),2);
    await outgoingVoice.getByRole('button',{name:'Скорость воспроизведения 2×. Изменить скорость'}).click();
    assert.equal(await outgoingVoice.locator('audio').evaluate(node=>node.playbackRate),1);
    assert.notEqual(await incomingVoice.evaluate(el=>getComputedStyle(el).backgroundColor),appearance.background);
    const incomingGeometry=await incomingVoice.evaluate(player=>{
      const box=player.getBoundingClientRect(), play=player.querySelector('.chat-audio-toggle')?.getBoundingClientRect(),
        track=player.querySelector('.chat-audio-track')?.getBoundingClientRect();
      return { bubble:(box.top+box.bottom)/2, play:play?(play.top+play.bottom)/2:-1,
        wave:track?(track.top+track.bottom)/2:-1 };
    });
    assert.ok(Math.abs(incomingGeometry.bubble-incomingGeometry.play)<=1 &&
      Math.abs(incomingGeometry.bubble-incomingGeometry.wave)<=1,
      'Incoming voice player needs the same axis: '+JSON.stringify(incomingGeometry));
    await page.screenshot({path:join(output,`voice-${width}-${theme}.png`)});
    await incomingVoice.getByRole('button',{name:'Воспроизвести голосовое сообщение',exact:true}).click();
    await expect(incomingVoice.getByRole('button',{name:'Приостановить голосовое сообщение',exact:true})).toBeVisible();
    await incomingVoice.getByRole('button',{name:'Приостановить голосовое сообщение',exact:true}).click();
    // Fake only microphone capture: production composer/recording state and UI
    // are exercised unchanged in both Chromium and iPhone-sized WebKit.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
      });
      // A real three-second AAC/M4A recording, supported by mobile Safari.
      // Silence is intentional: no fake speech is needed to verify playback.
      const buffer = Uint8Array.from(atob('AAAAHGZ0eXBNNEEgAAACAE00QSBpc29taXNvMgAAA15tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAALuAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACiXRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAALuAAAAAAAAAAAAAAAAQEAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAC7gAAAQAAAEAAAAAAgFtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAB9AAABhwFXEAAAAAAAtaGRscgAAAAAAAAAAc291bgAAAAAAAAAAAAAAAFNvdW5kSGFuZGxlcgAAAAGsbWluZgAAABBzbWhkAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAFwc3RibAAAAGpzdHNkAAAAAAAAAAEAAABabXA0YQAAAAAAAAABAAAAAAAAAAAAAQAQAAAAAB9AAAAAAAA2ZXNkcwAAAAADgICAJQABAASAgIAXQBUAAAAAABOIAAABKwWAgIAFFYhW5QAGgICAAQIAAAAgc3R0cwAAAAAAAAACAAAAGAAABAAAAAABAAABwAAAABxzdHNjAAAAAAAAAAEAAAABAAAAGQAAAAEAAAB4c3RzegAAAAAAAAAAAAAAGQAAABUAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAUc3RjbwAAAAAAAAABAAADigAAABpzZ3BkAQAAAHJvbGwAAAACAAAAAf//AAAAHHNiZ3AAAAAAcm9sbAAAAAEAAAAZAAAAAQAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAAAH1tZGF03gIATGF2YzYxLjE5LjEwMQACMEAOARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAH'), char => char.charCodeAt(0)).buffer;
      class FakeRecorder {
        static isTypeSupported(type) { return type === 'audio/mp4'; }
        constructor(_stream, options) { this.mimeType=options.mimeType; this.state='inactive'; this.onstop=null; this.ondataavailable=null; this.onerror=null; }
        start() { this.state='recording'; }
        stop() {
          this.state='inactive';
          this.ondataavailable?.({ data: new Blob([buffer], { type: this.mimeType }) });
          this.onstop?.();
        }
      }
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeRecorder });
    });
    const recordButton = page.getByRole('button',{name:'Записать голосовое сообщение'});
    await recordButton.click();
    const recordingUi=page.getByRole('group',{name:'Идёт запись голосового сообщения'});
    await expect(recordingUi).toBeVisible();
    await expect(recordingUi.getByRole('timer')).toHaveText(/^00:[0-9]{2}$/);
    await expect(recordingUi.locator('.thread-voice-recorder-wave span')).toHaveCount(23);
    await page.screenshot({path:join(output,`recording-${width}-${theme}.png`)});
    await recordingUi.getByRole('button',{name:'Отменить запись голосового сообщения'}).click();
    await expect(recordingUi).toHaveCount(0);
    await expect(page.getByRole('group',{name:'Голосовое сообщение готово к отправке'})).toHaveCount(0);
    await recordButton.click();
    await expect(recordingUi).toBeVisible();
    await recordingUi.getByRole('button',{name:'Завершить запись голосового сообщения'}).click();
    const voiceDraft=page.getByRole('group',{name:'Голосовое сообщение готово к отправке'});
    await expect(voiceDraft).toBeVisible();
    await expect(page.getByText('Голосовое сообщение.m4a')).toHaveCount(0);
    await expect(page.locator('audio[controls]')).toHaveCount(0);
    await expect(voiceDraft.locator('.chat-audio-wave span')).toHaveCount(36);
    // CI Linux WebKit's GStreamer build cannot play local M4A blob fixtures,
    // even though actual iOS Safari supports them. Do not misreport that this
    // synthetic test validates physical iPhone audio playback.
    await expect(voiceDraft.getByRole('button',{name:'Воспроизвести голосовое сообщение',exact:true})).toBeVisible();
    if (engine === 'chromium') {
      await voiceDraft.getByRole('button',{name:'Воспроизвести голосовое сообщение',exact:true}).click();
      await expect(voiceDraft.locator('audio')).toHaveJSProperty('paused', false);
      await voiceDraft.getByRole('button',{name:'Приостановить голосовое сообщение',exact:true}).click();
    }
    await page.screenshot({path:join(output,`draft-${width}-${theme}.png`)});
    await voiceDraft.getByRole('button',{name:'Удалить голосовое сообщение'}).click();
    await expect(voiceDraft).toHaveCount(0);
    if (engine === 'webkit') {
      // The previous iPhone layout bug was invisible to Chromium-only exchange
      // tests. Verify the actual WebKit method cards before skipping the rest.
      await page.getByRole('button',{name:'Обсудить условия',exact:true}).click();
      await page.getByRole('button',{name:'Предложить новые условия',exact:true}).click();
      const webkitForm=page.getByRole('dialog',{name:'Предложить обмен'});
      await expect(webkitForm.locator('.exchange-method-choice')).toHaveCount(3);
      const geometries=await webkitForm.locator('.exchange-method-choice').evaluateAll(items=>items.map(item=>{
        const box=item.getBoundingClientRect(),radio=item.querySelector('input[type=radio]').getBoundingClientRect();
        return {height:box.height,left:box.left,right:box.right,radioWidth:radio.width};
      }));
      assert.ok(geometries.every(g=>g.height>=55&&g.height<=120&&g.left>=0&&g.right<=width+1&&g.radioWidth<=24),
        'WebKit exchange methods must remain compact, readable and within iPhone viewport');
      await page.screenshot({path:join(output,`exchange-method-webkit-${width}-${theme}.png`)});
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(`PASS WebKit mobile ${width} ${theme}: voice + compact exchange method cards`);
      await context.close();
      continue;
    }
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
    await page.getByRole('button',{name:'Обсудить условия',exact:true}).click();
    await page.getByRole('button',{name:'Предложить новые условия',exact:true}).click();
    const formDialog=page.getByRole('dialog',{name:'Предложить обмен'});
    await expect(formDialog.getByText('1. Выберите способ передачи')).toBeVisible();
    const methodAboveGoods=await formDialog.evaluate(dialog=>{
      const method=dialog.querySelector('.exchange-method-picker');
      const goods=dialog.querySelector('.exchange-form-section');
      return Boolean(method&&goods&&method.getBoundingClientRect().top<goods.getBoundingClientRect().top);
    });
    assert.equal(methodAboveGoods,true,'Delivery method must appear before item pickers');
    await expect(formDialog.getByText('Способ передачи разрешён обоими объявлениями.')).toBeVisible();
    // Regression for the iPhone bug: text-input CSS gave radio controls 100%
    // width, producing 2000px-high cards and horizontal scrolling.
    async function assertCompactHandoffCards(selector, review=false) {
      const result=await formDialog.locator(selector).evaluate(group=>{
        const items=[...group.querySelectorAll('.exchange-method-choice')];
        const cards=items.map(item=>{
          const box=item.getBoundingClientRect();
          const radio=item.querySelector('input[type=radio]')?.getBoundingClientRect();
          const label=item.querySelector('span:last-child')?.getBoundingClientRect();
          return {height:box.height,width:box.width,left:box.left,right:box.right,
            radioW:radio?.width,radioH:radio?.height,textW:label?.width};
        });
        const form=group.closest('.exchange-form')?.getBoundingClientRect();
        return {cards,formWidth:form?.width,viewport:window.innerWidth,
          scrollWidth:document.documentElement.scrollWidth};
      });
      assert.equal(result.cards.length,3,'All three exchange modes must fit');
      assert.ok(result.cards.every(card=>card.height>=55&&card.height<=(review?90:120)),
        'Handoff cards must remain compact, not fill the screen');
      assert.ok(result.cards.every(card=>card.radioW>=18&&card.radioW<=24&&card.radioH>=18&&card.radioH<=24),
        'Radio circles must remain exactly touch-sized rather than 100% wide');
      assert.ok(result.cards.every(card=>card.textW>=110),
        'Method labels must have enough room to read horizontally');
      assert.ok(result.cards.every(card=>card.left>=0&&card.right<=result.viewport+1),
        'Method cards must not extend beyond the phone viewport');
      assert.ok(result.scrollWidth<=result.viewport+1,
        'Exchange modal must not create horizontal page overflow');
    }
    await assertCompactHandoffCards('.exchange-method-picker');
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('radio',{name:/Личная встреча/})).toBeChecked();
    await page.getByRole('radio',{name:/Доставка/}).check();
    await expect(page.getByRole('radio',{name:/Доставка/})).toBeChecked();
    await page.screenshot({path:join(output,`exchange-methods-${width}-${theme}.png`)});
    await page.getByRole('radio',{name:/Личная встреча/}).check();
    await page.getByRole('button',{name:'Проверить предложение'}).click();
    await expect(page.getByText('площадка не проверяет фактическую передачу товаров и денег.',{exact:false})).toBeVisible();
    const reviewMethod=formDialog.locator('.exchange-method-review');
    await expect(reviewMethod).toBeVisible();
    await assertCompactHandoffCards('.exchange-method-review',true);
    await expect(reviewMethod.getByRole('radio',{name:'Личная встреча'})).toBeChecked();
    await reviewMethod.getByRole('radio',{name:'Доставка'}).check();
    await expect(reviewMethod.getByRole('radio',{name:'Доставка'})).toBeChecked();
    await expect(formDialog.getByText('После принятия: резерв на 30 дней.',{exact:false})).toBeVisible();
    await page.screenshot({path:join(output,`review-delivery-${width}-${theme}.png`)});
    await reviewMethod.getByRole('radio',{name:'Личная встреча'}).check();
    await expect(formDialog.getByText('После принятия: резерв на 7 дней.',{exact:false})).toBeVisible();
    // An unapproved ONLINE option must require an explicit exception opt-in.
    await reviewMethod.getByRole('radio',{name:'Онлайн'}).check();
    await expect(formDialog.getByText('Условия объявлений не совпадают с выбранным способом.',{exact:false})).toBeVisible();
    await expect(formDialog.getByRole('button',{name:'Отправить предложение'})).toBeDisabled();
    await formDialog.getByRole('checkbox',{name:/Я хочу предложить этот способ как исключение/}).check();
    await expect(formDialog.getByRole('button',{name:'Отправить предложение'})).toBeEnabled();
    await reviewMethod.getByRole('radio',{name:'Личная встреча'}).check();
    await page.screenshot({path:join(output,`review-${width}-${theme}.png`)});
    const reviewActions=await formDialog.locator('.exchange-form-actions > button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};}));
    assert.equal(reviewActions.length,2);
    assert.ok(reviewActions[1].top-reviewActions[0].bottom>=14,'Review actions must be separated by at least 10px');
    assert.ok(reviewActions.every(r=>r.height>=44 && r.left>=0 && r.right<=width),'Review actions must fit mobile viewport');
    await page.getByRole('button',{name:'Отправить предложение',exact:true}).click();
    const sent=writes.find(w=>w.clientKey);assert.deepEqual(sent.giveIds,['macbook']);assert.deepEqual(sent.receiveIds,['iphone']);assert.equal(sent.cashKopecks,0);assert.equal(sent.previousId,'first');assert.equal(sent.handoffMethod,'MEETING');
    await page.getByRole('button',{name:'Обсудить условия',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Обсудить условия',exact:true})).toBeVisible();
    const negotiationGap=await page.locator('.exchange-actions-negotiation > button').evaluateAll(nodes=>nodes.slice(1).map((n,i)=>n.getBoundingClientRect().top-nodes[i].getBoundingClientRect().bottom));
    assert.ok(negotiationGap.length>=2 && negotiationGap.every(gap=>gap>=10),'Negotiation actions must not touch');
    assert.equal(writes.some(w=>w.action==='accept'),false);
    await page.getByRole('button',{name:'Принять условия',exact:true}).click();
    await expect(page.getByText('Ожидаем QR от предложившего обмен.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Я получил вещи',exact:true})).toHaveCount(0);
    // The proposer confirms on their device; the peer must scan their key.
    offers=[{...offers[0],version:3,confirmations:[{userId:'peer'}]}];
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    const scanQr=page.getByRole('button',{name:'Сканировать QR подтверждения обмена'});
    await expect(scanQr).toBeVisible();
    await scanQr.click();
    const testQr='BX1.first.1792699999.'+'a'.repeat(64);
    await page.getByRole('textbox',{name:'Код обмена'}).fill(testQr);
    await page.getByRole('button',{name:'Открыть',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Проверка подтверждения обмена'})).toBeVisible();
    await page.screenshot({path:join(output,`handoff-confirm-${width}-${theme}.png`)});
    await page.getByRole('button',{name:'Я получил вещи и подтверждаю обмен'}).click();
    assert.equal(writes.some(w=>w.action==='confirm'&&w.qrToken===testQr),true);
    await expect(page.getByText('Обмен завершён')).toBeVisible();
    // Re-render as proposer with a confirmed first-side receipt. Scan the real
    // generated QR pixels, not just the existence of an SVG element.
    offers=[{...offers[0],status:'ACCEPTED',senderId:'me',recipientId:'peer',version:3,confirmations:[{userId:'me'}]}];
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    await page.getByRole('button',{name:'Показать QR подтверждения'}).click();
    const handoffDialog=page.getByRole('dialog',{name:'QR-код подтверждения обмена'});
    await expect(handoffDialog).toBeVisible();
    const qrPng=await handoffDialog.getByRole('img',{name:'Одноразовый QR-код подтверждения обмена'}).screenshot();
    const decoded=await sharp(qrPng).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const read=jsQR(new Uint8ClampedArray(decoded.data),decoded.info.width,decoded.info.height,{inversionAttempts:'attemptBoth'});
    assert.equal(read?.data,'BX1.first.1792700000.'+'b'.repeat(64));
    await page.screenshot({path:join(output,`handoff-qr-${width}-${theme}.png`)});
    await handoffDialog.getByRole('button',{name:'Закрыть QR'}).click();
    // Delivery and remote confirmation must not depend on the meeting QR.
    offers=[{...offers[0],handoffMethod:'DELIVERY',senderId:'peer',recipientId:'me',status:'ACCEPTED',version:2,shipping:{sender:{carrier:'СДЭК',trackingNumber:'ABC12345',submittedAt:new Date().toISOString()}},confirmations:[]}];
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    await expect(page.getByText('Доставка',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Добавить трек-номер'}).click();
    await page.getByRole('textbox',{name:'Служба доставки'}).fill('Почта России');
    await page.getByRole('textbox',{name:'Трек-номер'}).fill('123456789001');
    await page.getByRole('button',{name:'Сохранить отправление'}).click();
    assert.equal(writes.some(w=>w.shipment?.trackingNumber==='123456789001'),true);
    await expect(page.getByText('Почта России · 123456789001')).toBeVisible();
    await page.screenshot({path:join(output,`exchange-delivery-${width}-${theme}.png`)});
    await expect(page.getByRole('button',{name:'Подтвердить получение'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Сканировать QR подтверждения обмена'})).toHaveCount(0);
    offers=[{...offers[0],handoffMethod:'ONLINE',shipping:null,version:2,confirmations:[]}];
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    await expect(page.getByText('Онлайн-обмен',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Подтвердить выполнение'})).toBeVisible();
    await page.screenshot({path:join(output,`exchange-online-${width}-${theme}.png`)});
    assert.equal(errors.length,0,errors.join('\n'));
    // Two delivery-only listings must automatically suggest DELIVERY, not a meeting.
    const originalOffer=offers[0];
    offers=[];
    listing.exchangePreferences={handoffMethods:['DELIVERY']};
    laptop.exchangePreferences={handoffMethods:['DELIVERY']};
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    await page.getByRole('button',{name:'Предложить обмен · выбрать способ'}).click();
    await expect(formDialog.getByRole('radio',{name:'Доставка'})).toBeChecked();
    await formDialog.locator('.exchange-choice input[type=checkbox]').first().check();
    await expect(formDialog.getByRole('radio',{name:'Доставка'})).toBeChecked();
    await expect(formDialog.getByText('Способ передачи разрешён обоими объявлениями.')).toBeVisible();
    await page.screenshot({path:join(output,`exchange-delivery-only-${width}-${theme}.png`)});
    await formDialog.getByRole('button',{name:'Закрыть'}).click();
    // Incompatible listing preferences require a visible exception request.
    laptop.exchangePreferences={handoffMethods:['MEETING']};
    await page.getByRole('button',{name:'Предложить обмен · выбрать способ'}).click();
    await formDialog.locator('.exchange-choice input[type=checkbox]').first().check();
    await expect(formDialog.getByText('Общих способов передачи нет.',{exact:false})).toBeVisible();
    await expect(formDialog.getByText('Не разрешён вашими объявлениями',{exact:false})).toBeVisible();
    await formDialog.getByRole('radio',{name:'Личная встреча'}).check();
    await expect(formDialog.getByText('Не разрешён объявлениями собеседника',{exact:false})).toBeVisible();
    await formDialog.getByRole('radio',{name:'Доставка'}).check();
    await expect(formDialog.getByRole('button',{name:'Проверить предложение'})).toBeDisabled();
    await formDialog.getByRole('checkbox',{name:/Я хочу предложить этот способ как исключение/}).check();
    await expect(formDialog.getByRole('button',{name:'Проверить предложение'})).toBeEnabled();
    await page.screenshot({path:join(output,`exchange-exception-${width}-${theme}.png`)});
    await formDialog.getByRole('button',{name:'Закрыть'}).click();
    // Counterparty must explicitly acknowledge an exception before acceptance.
    offers=[{...originalOffer,status:'PENDING',version:1,handoffMethod:'DELIVERY',handoffException:true,confirmations:[]}];
    await page.evaluate(()=>window.dispatchEvent(new Event('barter-exchange-refresh')));
    await expect(page.locator('.exchange-card')).toHaveCount(1);
    await expect(page.getByRole('dialog',{name:'Обсудить условия'})).toHaveCount(0);
    await page.getByRole('button',{name:'Обсудить условия',exact:true}).click();
    await expect(page.getByText('Запрос исключения',{exact:true})).toBeVisible();
    const consentAccept=page.getByRole('button',{name:'Принять условия',exact:true});
    await expect(consentAccept).toBeDisabled();
    await page.getByRole('checkbox',{name:/Я согласен/}).check();
    await expect(consentAccept).toBeEnabled();
    await consentAccept.click();
    assert.ok(writes.some(w=>w.action==='accept'&&w.acknowledgeHandoffException===true),
      'Acceptance of incompatible delivery requires affirmative recipient consent');
    console.log(`PASS ${width} ${theme}: exchange review, send, accept, details, search, mute; screenshots captured`);
    await context.close();
  }
} finally { await browser?.close();server.kill('SIGTERM'); }
