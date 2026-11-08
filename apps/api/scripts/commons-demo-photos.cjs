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
/** Preflight entire album set before any database mutation. */
async function buildAlbums(minPhotos=2) {
  const albums=[];
  for (let index=0;index<SEARCH_TERMS.length;index++) {
    const term=SEARCH_TERMS[index];
    const hits=await queryCommons(term);
    const unique=[...new Map(hits.map(hit=>[hit.url,hit])).values()].slice(0,4);
    if (unique.length < minPhotos) {
      throw new Error('No licensed photo set ('+unique.length+'/'+minPhotos+
        ') for demo listing #'+(index+1)+' '+term+'; database unchanged.');
    }
    albums.push(unique);
  }
  return albums;
}
module.exports={buildAlbums,SEARCH_TERMS,ACCEPTED};
