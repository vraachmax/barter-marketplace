/**
 * Commons photo discovery for explicitly labelled demo listings.
 * Select actual raster photos with a reusable license and preserve attribution.
 * Photo retrieval runs at seed time; never fabricate Commons URLs or sources.
 * This does NOT prove product condition or ownership: demo descriptions say so.
 */
const SEARCH_TERMS = [
  'iPhone 13 smartphone', 'PlayStation 5 console', 'MacBook Air M1',
  'Nintendo Switch OLED', 'Xiaomi robot vacuum', 'DeLonghi coffee machine',
  'leather jacket clothing', 'New Balance sneakers', 'baby stroller',
  'children bicycle', 'Samsung Galaxy S22', 'Xbox Series S console',
  'Dyson V8 vacuum cleaner', 'wool coat clothing', 'child car seat',
  'Apple iPad tablet', 'PlayStation DualSense controller', 'LG microwave oven',
  'Adidas sneakers', 'baby wooden crib', 'Google Pixel 7 smartphone',
  'gaming computer monitor', 'Redmond multicooker', 'backpack',
  'child scooter', 'iPhone SE 2022', 'gaming keyboard', 'Braun blender',
  'winter puffer jacket', 'high chair baby',
];
const FALLBACK_TERMS = [
  'smartphone', 'game console', 'laptop computer', 'handheld game console',
  'robot vacuum cleaner', 'espresso coffee machine', 'leather jacket', 'sneakers',
  'baby stroller', 'child bicycle', 'Samsung smartphone', 'game console',
  'cordless vacuum cleaner', 'wool coat', 'baby car seat', 'tablet computer',
  'video game controller', 'microwave oven', 'sneakers', 'wooden baby crib',
  'Google smartphone', 'computer monitor', 'rice cooker', 'travel backpack',
  'child scooter', 'Apple smartphone', 'mechanical keyboard', 'hand blender',
  'winter jacket', 'baby high chair',
];
const ACCEPTED = /^(?:CC0(?: 1\.0)?|CC BY(?:-SA)?(?: [1-4]\.0)?|Public domain)$/i;
function plain(html) {
  return String(html || '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').trim().slice(0,300);
}
async function queryCommons(term) {
  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  const params = {action:'query', generator:'search', gsrsearch:'filetype:bitmap ' + term,
    gsrnamespace:'6', gsrlimit:'35', prop:'imageinfo', iiprop:'url|mime|extmetadata',
    iiurlwidth:'960', format:'json', formatversion:'2'};
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key,value);
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),12000);
  try {
    const response = await fetch(endpoint, {signal:controller.signal,
      headers:{'User-Agent':'Barter-Demo-Seed/1.0 (marketplace demo; contact via repo)'}});
    if (!response.ok) throw new Error('Commons HTTP '+response.status);
    const json = await response.json();
    return (json.query?.pages ?? []).flatMap(page => {
      const info = page.imageinfo?.[0], meta = info?.extmetadata ?? {};
      const license = plain(meta.LicenseShortName?.value);
      const title = String(page.title || '');
      const media = String(info?.mime || '');
      if (!info?.thumburl && !info?.url) return [];
      if (!media.startsWith('image/') || /svg|gif/i.test(media)) return [];
      if (!ACCEPTED.test(license)) return [];
      // API relevance determines ordering; reject obviously irrelevant files.
      return [{
        url: info.thumburl || info.url, source: info.descriptionurl ||
          ('https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replace(/ /g,'_'))),
        author: plain(meta.Artist?.value) || 'Wikimedia Commons contributor',
        license, title,
      }];
    });
  } finally {clearTimeout(timer);}
}

/** Openverse indexes Commons and other openly licensed collections.
 * Use as a fallback when Wikimedia's API is rate-limited.
 * The license filter is independently rechecked; Openverse metadata is not
 * evidence that a given photograph depicts the advertised model accurately.
 */
async function queryOpenverse(term) {
  const endpoint=new URL('https://api.openverse.org/v1/images/');
  endpoint.searchParams.set('q',term);
  endpoint.searchParams.set('license','cc0,by,by-sa,pdm');
  endpoint.searchParams.set('page_size','20');
  endpoint.searchParams.set('mature','false');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try {
    const res=await fetch(endpoint,{signal:controller.signal,headers:{
      'User-Agent':'Barter-Demo-Seed/1.1 (+https://github.com/vraachmax/barter-marketplace)',
      'Accept':'application/json'
    }});
    if(!res.ok) throw new Error('Openverse HTTP '+res.status);
    const json=await res.json();
    return (json.results ?? []).flatMap(hit=>{
      const type=String(hit.filetype||'').toLowerCase();
      if(hit.mature || ['svg','gif'].includes(type)) return [];
      const lic=String(hit.license||'').toLowerCase();
      if(!['cc0','by','by-sa','pdm'].includes(lic)) return [];
      const license=lic==='pdm'?'Public domain':lic==='cc0'?'CC0 1.0':
        'CC '+lic.toUpperCase()+' '+String(hit.license_version||'4.0');
      if(!ACCEPTED.test(license)) return [];
      const img=String(hit.url||'');
      const source=String(hit.foreign_landing_url||hit.detail_url||'');
      if(!img.startsWith('https://') || !source.startsWith('https://')) return [];
      return [{url:img,source,license,author:plain(hit.creator)||'Openverse contributor',
        title:plain(hit.title)||term}];
    });
  } finally {clearTimeout(timer);}
}
let commonsRateLimited=false;
async function discoverPhotos(term) {
  if(!commonsRateLimited) {
    try {return await queryCommons(term);}
    catch(err) {
      if(!/Commons HTTP 429/.test(String(err))) throw err;
      commonsRateLimited=true;
      console.warn('Commons API rate-limited; switching to Openverse licensed media search');
    }
  }
  return queryOpenverse(term);
}

/** Preflight entire album set before any database mutation. */
async function buildAlbums(minPhotos=2) {
  const albums=[];
  for (let index=0;index<SEARCH_TERMS.length;index++) {
    const term=SEARCH_TERMS[index];
    const hits=await discoverPhotos(term);
    // If the exact model has too few licensed photos, use images of the
    // clearly labelled product TYPE rather than fabricate exact-model photos.
    if(new Set(hits.map(hit=>hit.url)).size < minPhotos) {
      const broad=await queryOpenverse(FALLBACK_TERMS[index]);
      hits.push(...broad);
    }
    // Be considerate to the public Openverse service; requests are serial.
    if(commonsRateLimited) await new Promise(resolve=>setTimeout(resolve,1100));
    const unique=[...new Map(hits.map(hit=>[hit.url,hit])).values()].slice(0,4);
    if (unique.length < minPhotos) {
      throw new Error('No licensed photo set ('+unique.length+'/'+minPhotos+
        ') for demo listing #'+(index+1)+' '+term+'; database unchanged.');
    }
    albums.push(unique);
  }
  return albums;
}
module.exports={buildAlbums,SEARCH_TERMS,FALLBACK_TERMS,ACCEPTED,queryOpenverse};
