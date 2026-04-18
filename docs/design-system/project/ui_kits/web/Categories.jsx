/* global React */

const CATS = [
  'Авто', 'Недвижимость', 'Работа', 'Одежда, обувь, аксессуары',
  'Хобби и отдых', 'Животные', 'Готовый бизнес и оборудование',
  'Услуги', 'Электроника', 'Для дома и дачи', 'Запчасти',
  'Товары для детей', 'Жильё для путешествия', 'Красота и здоровье',
];

function CategoryTiles({ onPick }) {
  const B = window.BRAND;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 28 }}>
      {CATS.map(name => (
        <div key={name} onClick={() => onPick?.(name)}
          style={{ background: B.muted, borderRadius: 8, padding: '14px 14px', minHeight: 78, display: 'flex', alignItems: 'flex-start', fontSize: 13, color: '#000', fontWeight: 500, lineHeight: 1.25, cursor: 'pointer', transition: 'background 120ms' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#ECEBEA'}
          onMouseLeave={(e) => e.currentTarget.style.background = B.muted}>
          {name}
        </div>
      ))}
    </div>
  );
}

window.CATS = CATS;
window.CategoryTiles = CategoryTiles;
