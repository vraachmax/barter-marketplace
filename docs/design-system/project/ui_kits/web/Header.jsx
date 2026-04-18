/* global React */

function Logo({ height = 28 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height }}>
      <AvitoMark size={height}/>
      <span style={{ fontSize: height * 1.1, fontWeight: 800, color: '#000', letterSpacing: '-0.04em', lineHeight: 1 }}>Бартер</span>
    </div>
  );
}

function Header({ onGoHome, query, setQuery }) {
  const B = window.BRAND;
  const topLink = { fontSize: 13, color: B.fgDefault, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 };
  return (
    <header style={{ background: '#fff', borderBottom: `1px solid ${B.border}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <span style={topLink}>Для бизнеса <Icon name="chevDown" size={13} color={B.fgMuted}/></span>
          <span style={topLink}>Карьера в Бартере</span>
          <span style={topLink}>Помощь</span>
          <span style={topLink}>Каталоги <Icon name="chevDown" size={13} color={B.fgMuted}/></span>
          <span style={topLink}>#яПомогаю</span>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <Icon name="heart" size={18} color={B.fgDefault}/>
          <Icon name="cart"  size={18} color={B.fgDefault}/>
          <span style={{ ...topLink, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Вход и регистрация
          </span>
          <span style={{ ...topLink, fontWeight: 500, color: '#000' }}>+ Разместить объявление</span>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={onGoHome} style={{ cursor: 'pointer' }}><Logo height={28}/></div>

        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: B.blue, color: '#fff', border: 'none', padding: '0 18px', borderRadius: 9999, fontSize: 15, fontWeight: 500, cursor: 'pointer', height: 44, marginLeft: 8 }}>
          <Icon name="grid" size={14}/>Все категории
        </button>

        <form onSubmit={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', height: 44, border: `2px solid ${B.blue}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 14, color: B.fgSubtle }}><Icon name="search" size={18} color={B.fgSubtle}/></div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по объявлениям" style={{ flex: 1, border: 'none', padding: '0 12px', fontSize: 15, outline: 'none', color: '#000', fontFamily: 'inherit' }}/>
          <button type="submit" style={{ background: B.blue, color: '#fff', border: 'none', padding: '0 30px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Найти</button>
        </form>

        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#000', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Icon name="pin" size={16}/>Москва
        </button>
      </div>
    </header>
  );
}

window.Logo = Logo;
window.Header = Header;
