/* global React */

function Breadcrumbs({ items }) {
  const B = window.BRAND;
  return (
    <div style={{ fontSize: 13, color: B.fgMuted, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span style={{ color: B.fgSubtle }}>›</span> : null}
          <span style={{ cursor: i < items.length - 1 ? 'pointer' : 'default', color: i < items.length - 1 ? B.blue : B.fgMuted }}>{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function HomePage({ listings, onOpenListing }) {
  const B = window.BRAND;
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px' }}>
      <CategoryTiles onPick={() => {}}/>
      <div style={{ height: 24 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {listings.map(l => <ListingCard key={l.id} listing={l} onClick={() => onOpenListing(l)}/>)}
      </div>
    </div>
  );
}

function Footer() {
  const B = window.BRAND;
  const cls = { fontSize: 13, color: B.fgMuted, cursor: 'pointer', padding: '4px 0' };
  return (
    <footer style={{ background: '#fff', padding: '40px 0 24px', marginTop: 32, borderTop: `1px solid ${B.border}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32 }}>
        <div>
          <Logo height={24}/>
          <p style={{ fontSize: 12, color: B.fgMuted, marginTop: 12, lineHeight: 1.5 }}>Маркетплейс частных объявлений по всей России.</p>
        </div>
        {[
          ['Разделы', ['Транспорт', 'Недвижимость', 'Работа', 'Услуги', 'Личные вещи']],
          ['О Бартере', ['О компании', 'Вакансии', 'Контакты', 'Для бизнеса']],
          ['Помощь', ['Безопасность', 'Правила сайта', 'Поддержка']],
          ['Приложение', ['iPhone', 'Android', 'Мобильная версия']],
        ].map(([title, items]) => (
          <div key={title}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 10 }}>{title}</div>
            {items.map(it => <div key={it} style={cls}>{it}</div>)}
          </div>
        ))}
      </div>
    </footer>
  );
}

window.HomePage = HomePage;
window.Footer = Footer;
window.Breadcrumbs = Breadcrumbs;
