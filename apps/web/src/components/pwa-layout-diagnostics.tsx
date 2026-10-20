'use client';
import { useEffect, useState } from 'react';

export function PwaLayoutDiagnostics() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState('');
  useEffect(() => {
    const toggle = () => setOpen(value => !value);
    window.addEventListener('barter:pwa-diagnostics', toggle);
    return () => window.removeEventListener('barter:pwa-diagnostics', toggle);
  }, []);
  useEffect(() => {
    if (!open) return;
    const inspect = () => {
      const nav = document.querySelector<HTMLElement>('.magic-nav');
      const shell = document.querySelector<HTMLElement>('.app-viewport');
      const bar = document.querySelector<HTMLElement>('.liquid-nav');
      const plus = document.querySelector<HTMLElement>('.liquid-nav__add');
      const scroller = document.querySelector<HTMLElement>('.app-scroll-root');
      const nr = nav?.getBoundingClientRect();
      const sr = shell?.getBoundingClientRect();
      const br = bar?.getBoundingClientRect();
      const pr = plus?.getBoundingClientRect();
      const vv = window.visualViewport;
      const num = (x: number | undefined) => x === undefined ? '?' : x.toFixed(1);
      const style = nav ? getComputedStyle(nav) : null;
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
      document.body.appendChild(probe);
      const nativeInset = getComputedStyle(probe);
      const insets = nativeInset.paddingTop + ' / ' + nativeInset.paddingBottom;
      probe.remove();
      setInfo([
        'Build: PWA-geometry-20261020',
        'standalone: ' + matchMedia('(display-mode: standalone)').matches,
        'inner: ' + innerWidth + ' x ' + innerHeight,
        'client: ' + document.documentElement.clientWidth + ' x ' + document.documentElement.clientHeight,
        'screen: ' + screen.width + ' x ' + screen.height + ' DPR=' + devicePixelRatio,
        'visual: top=' + num(vv?.offsetTop) + ' h=' + num(vv?.height),
        'safe top/bottom: ' + insets,
        'css inset: ' + getComputedStyle(document.documentElement).getPropertyValue('--mobile-dock-inset'),
        'shell: top=' + num(sr?.top) + ' bottom=' + num(sr?.bottom) + ' h=' + num(sr?.height),
        'scroll: bottom=' + num(scroller?.getBoundingClientRect().bottom),
        'nav: top=' + num(nr?.top) + ' bottom=' + num(nr?.bottom) + ' h=' + num(nr?.height),
        'nav style: ' + style?.position + ' bottom=' + style?.bottom + ' padding=' + style?.paddingBottom,
        'bar: top=' + num(br?.top) + ' bottom=' + num(br?.bottom),
        'plus: top=' + num(pr?.top),
        'gap window/nav: ' + num(nr ? innerHeight-nr.bottom : undefined),
        'gap shell/nav: ' + num(sr && nr ? sr.bottom-nr.bottom : undefined),
        'gap visual/nav: ' + num(vv && nr ? vv.offsetTop+vv.height-nr.bottom : undefined),
        'parent: ' + nav?.parentElement?.className,
      ].join('\n'));
    };
    inspect();
    const id = window.setInterval(inspect, 800);
    window.visualViewport?.addEventListener('resize', inspect);
    return () => { clearInterval(id); window.visualViewport?.removeEventListener('resize', inspect); };
  }, [open]);
  if (!open) return null;
  return (
    <aside role="dialog" aria-label="Диагностика PWA" data-pwa-diagnostics="true"
      style={{ position:'fixed', zIndex:9999, top:'max(65px,env(safe-area-inset-top,0px))',
        left:8,right:8,maxWidth:440,marginInline:'auto',padding:12,borderRadius:14,
        maxHeight:'72dvh',overflowY:'auto',background:'#16181b',color:'white',
        border:'2px solid #ff5a0a',boxShadow:'0 8px 30px #0007' }}>
      <strong>Диагностика положения панели</strong>
      <pre style={{whiteSpace:'pre-wrap',fontSize:11,lineHeight:1.55,overflowWrap:'anywhere'}}>{info}</pre>
      <div style={{display:'flex',gap:8}}>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(info).catch(() => {}); }}
          style={{padding:'8px 12px',borderRadius:8,background:'#ff5a0a',color:'white'}}>Копировать</button>
        <button type="button" aria-label="Закрыть диагностику" onClick={() => setOpen(false)}
          style={{padding:'8px 12px',borderRadius:8,background:'#555',color:'white'}}>Закрыть</button>
      </div>
    </aside>
  );
}
