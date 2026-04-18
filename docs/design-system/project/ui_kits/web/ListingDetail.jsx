/* global React */

function ListingDetail({ listing, onBack, onMessage }) {
  const B = window.BRAND;
  const [msgOpen, setMsgOpen] = React.useState(false);
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 12, color: B.fgMuted, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ cursor: 'pointer' }} onClick={onBack}>Главная</span>
        <Icon name="arrow" size={12} color="#B5A695"/>
        <span style={{ cursor: 'pointer' }}>Электроника</span>
        <Icon name="arrow" size={12} color="#B5A695"/>
        <span>{listing.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: B.fgStrong, marginBottom: 8, letterSpacing: '-0.005em' }}>{listing.title}</h1>
            <div style={{ fontSize: 12, color: B.fgMuted, display: 'flex', gap: 12 }}>
              <span>№ 123 456 789</span>
              <span>Размещено: сегодня</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="eye" size={12}/>342 просмотра</span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg, #bfdbfe, #3b82f6)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 48, fontWeight: 700 }}>{listing.ph || '📷'}</div>
            <div style={{ display: 'flex', gap: 6, padding: 10 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, aspectRatio: '1', borderRadius: 6, background: `linear-gradient(135deg, hsl(${i*50},70%,75%), hsl(${i*50+30},60%,55%))`, border: i === 0 ? `2px solid ${B.blue}` : 'none' }}/>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: B.fgStrong, marginBottom: 12 }}>Характеристики</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Состояние', 'Отличное'], ['Гарантия', 'Нет'],
                ['Память', '256 ГБ'],      ['Цвет', 'Deep Purple'],
                ['Год выпуска', '2023'],   ['Комплектация', 'Полная'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', borderBottom: '1px solid #F2EAE1' }}>
                  <span style={{ color: B.fgMuted }}>{k}</span>
                  <span style={{ color: B.fgStrong, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: B.fgStrong, marginBottom: 12 }}>Описание</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: B.fgStrong }}>
              Продаю в отличном состоянии, пользовался 6 месяцев. В комплекте коробка, зарядка, документы.
              Покупался в официальном магазине, все пломбы и стикеры на месте. Никогда не падал,
              экран без царапин. Возможен обмен на MacBook с доплатой.
            </p>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, position: 'sticky', top: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: B.fgTitle, marginBottom: 4, letterSpacing: '-0.01em' }}>{listing.price}</div>
            <div style={{ fontSize: 12, color: B.fgMuted, marginBottom: 14 }}>История цены →</div>
            <button onClick={() => { setMsgOpen(true); onMessage?.(); }} style={{ width: '100%', background: B.blue, color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>Написать сообщение</button>
            <button style={{ width: '100%', background: '#fff', color: B.fgStrong, border: `1px solid ${B.borderInput}`, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>Показать телефон</button>
            <div style={{ fontSize: 12, color: B.fgMuted, textAlign: 'center' }}>Отвечает за несколько часов</div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: B.blue, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700 }}>А</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: B.fgStrong }}>Алексей</div>
                <div style={{ fontSize: 12, color: B.fgMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="star" size={12} color="#F59E0B" fill="#F59E0B"/>
                  4.9 · 23 отзыва
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: B.fgMuted, marginBottom: 6 }}>На Barter с 2024</div>
            <div style={{ fontSize: 12, color: B.blue, display: 'inline-flex', alignItems: 'center', gap: 4, background: B.blueSoft, padding: '4px 10px', borderRadius: 9999, fontWeight: 600 }}>
              <Icon name="check" size={12} color={B.blue}/>Документы проверены
            </div>
          </div>
        </aside>
      </div>

      {msgOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 500 }} onClick={() => setMsgOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F2EAE1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Написать Алексею</div>
              <button onClick={() => setMsgOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="x" size={18} color="#8C7A6A"/></button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: B.fgMuted, marginBottom: 10 }}>Быстрые вопросы</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['Здравствуйте!', 'Ещё продаётся?', 'Возможен торг?', 'Когда можно посмотреть?'].map(q => (
                  <button key={q} style={{ background: B.muted, border: 'none', padding: '6px 12px', borderRadius: 9999, fontSize: 12, cursor: 'pointer', color: B.fgStrong }}>{q}</button>
                ))}
              </div>
              <textarea placeholder="Ваше сообщение" style={{ width: '100%', height: 90, border: `1px solid ${B.borderInput}`, borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none' }}/>
              <button style={{ width: '100%', marginTop: 12, background: B.blue, color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Отправить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

window.ListingDetail = ListingDetail;
