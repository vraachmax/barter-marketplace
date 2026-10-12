/** Runs before first paint, including before React hydrates a home-screen app. */
export const THEME_BOOTSTRAP = `(function(){
  var p='LIGHT';
  try { p=localStorage.getItem('barter_theme_pref')||'LIGHT'; } catch(e) {}
  if(p!=='DARK'&&p!=='SYSTEM')p='LIGHT';
  var dark=p==='DARK'||(p==='SYSTEM'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var theme=dark?'dark':'light';
  var el=document.documentElement;
  el.setAttribute('data-theme',theme);
  el.classList.toggle('dark',dark);
  el.setAttribute('data-theme-pref',p);
  el.style.colorScheme=theme;
  var meta=document.querySelector('meta[name="theme-color"]:not([media])');
  if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta);}
  meta.content=location.pathname.indexOf('/games/barter-dash')===0?'#060914':dark?'#141519':'#FFFFFF';
})();`;
