import { NextRequest } from 'next/server';

const labels = [
  'iPhone 13', 'PlayStation 5', 'MacBook Air', 'Nintendo Switch',
  'Робот-пылесос', 'Кофемашина', 'Кожаная куртка', 'New Balance',
  'Коляска 2 в 1', 'Детский велосипед', 'Galaxy S22', 'Xbox Series S',
  'Беспроводной пылесос', 'Шерстяное пальто', 'Автокресло',
  'iPad', 'DualSense', 'Микроволновая печь', 'Adidas',
  'Детская кроватка', 'Google Pixel', 'Игровой монитор',
  'Мультиварка', 'Рюкзак', 'Детский самокат', 'iPhone SE',
  'Игровая клавиатура', 'Блендер', 'Зимний пуховик', 'Стульчик для кормления',
];
const tones = [
  ['#fff7ed','#fdba74','#f97316'],['#eff6ff','#93c5fd','#2563eb'],
  ['#f0fdf4','#86efac','#16a34a'],['#fdf2f8','#f9a8d4','#db2777'],
  ['#faf5ff','#d8b4fe','#9333ea'],
] as const;
function xmlEscape(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function illustration(index:number,variant:number,color:string) {
  const x=variant===1?450:430;
  const group=[0,1,1,1,4,4,2,2,3,3,0,1,4,2,3,0,1,4,2,3,0,1,4,2,3,0,1,4,2,3][index];
  switch(group) {
    case 0: return `<rect x="${x-110}" y="128" width="220" height="294" rx="34" fill="#1f2937"/>
      <rect x="${x-97}" y="142" width="194" height="260" rx="21" fill="#f8fafc"/>
      <circle cx="${x}" cy="388" r="6" fill="#334155"/>
      <path d="M${x-85} 292q85-115 170 0q-85 115-170 0" fill="${color}" opacity=".56"/>`;
    case 1: return `<rect x="${x-150}" y="184" width="300" height="180" rx="32" fill="#1f2937"/>
      <rect x="${x-124}" y="205" width="248" height="130" rx="14" fill="#f8fafc"/>
      <path d="M${x-55} 269h45m-22-22v44" stroke="${color}" stroke-width="13" stroke-linecap="round"/>
      <circle cx="${x+53}" cy="254" r="10" fill="${color}"/><circle cx="${x+84}" cy="282" r="10" fill="${color}"/>
      <rect x="${x-90}" y="364" width="180" height="15" rx="7" fill="#374151"/>`;
    case 2: return `<path d="M${x-145} 205l68-66 77 30 77-30 68 66-47 70-30-21v164h-136V254l-30 21z" fill="#334155" stroke="#fff" stroke-width="6"/>
      <path d="M${x} 169v251" stroke="${color}" stroke-width="9"/><path d="M${x-40} 185q40 28 80 0" stroke="#e5e7eb" stroke-width="8" fill="none"/>`;
    case 3: return `<path d="M${x-120} 198h240l-28 118h-184z" fill="#334155"/>
      <path d="M${x-126} 185h252" stroke="${color}" stroke-width="15" stroke-linecap="round"/>
      <path d="M${x-65} 315l-30 65m160-65 30 65" stroke="#334155" stroke-width="13"/>
      <circle cx="${x-95}" cy="395" r="30" fill="#1f2937" stroke="#d1d5db" stroke-width="11"/>
      <circle cx="${x+95}" cy="395" r="30" fill="#1f2937" stroke="#d1d5db" stroke-width="11"/>`;
    default: return `<rect x="${x-145}" y="170" width="290" height="220" rx="48" fill="#334155"/>
      <rect x="${x-120}" y="195" width="240" height="155" rx="22" fill="#f8fafc"/>
      <circle cx="${x}" cy="270" r="55" stroke="${color}" stroke-width="18" fill="#e5e7eb"/>
      <circle cx="${x}" cy="270" r="15" fill="#475569"/>
      <rect x="${x-55}" y="395" width="110" height="12" rx="6" fill="#475569"/>`;
  }
}
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string;view:string}>}) {
  const {id,view}=await params;
  if(!/^\d{1,2}$/.test(id)||!/^[12]$/.test(view)) return new Response('Not found',{status:404});
  const idx=Number(id)-1,v=Number(view);
  if(idx<0||idx>=labels.length) return new Response('Not found',{status:404});
  const palette=tones[idx%tones.length];
  const title=xmlEscape(labels[idx]);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="880" height="660" viewBox="0 0 880 660">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs>
    <rect width="880" height="660" fill="url(#bg)"/>
    <circle cx="${v===1?120:745}" cy="110" r="160" fill="#fff" opacity=".32"/>
    <circle cx="${v===1?750:95}" cy="520" r="125" fill="${palette[2]}" opacity=".12"/>
    <g transform="rotate(${v===1?5:-3} 440 280)">${illustration(idx,v,palette[2])}</g>
    <rect x="34" y="30" width="144" height="43" rx="21" fill="#fff" opacity=".94"/>
    <text x="106" y="58" text-anchor="middle" font-size="18" font-weight="700" font-family="Arial,sans-serif" fill="${palette[2]}">ДЕМО · БАРТЕР</text>
    <rect x="0" y="488" width="880" height="172" fill="#fff" opacity=".94"/>
    <text x="45" y="543" font-size="37" font-weight="700" font-family="Arial,sans-serif" fill="#111827">${title}</text>
    <text x="45" y="586" font-size="19" font-family="Arial,sans-serif" fill="#64748b">Иллюстрация · не фотография реального товара</text>
    <text x="823" y="627" text-anchor="end" font-size="17" font-family="Arial,sans-serif" fill="#9ca3af">0${v} / 02</text>
  </svg>`;
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=86400, s-maxage=604800','X-Content-Type-Options':'nosniff'}});
}
