/* global React */

function ListingThumb({ src, ph }) {
  const B = window.BRAND;
  if (src) return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: B.muted, fontSize: 48 }}>
      <span>{ph || '📷'}</span>
    </div>
  );
}

function ListingCard({ listing, onClick }) {
  const B = window.BRAND;
  const [fav, setFav] = React.useState(false);
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: B.muted, marginBottom: 10 }}>
        <ListingThumb src={listing.img} ph={listing.ph}/>
        {listing.promo ? (
          <div style={{ position: 'absolute', top: 8, left: 8, background: listing.promo === 'ТОП' ? B.accent : listing.promo === 'XL' ? B.blue : '#000', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 3, letterSpacing: '0.04em' }}>{listing.promo}</div>
        ) : null}
        <button onClick={(e) => { e.stopPropagation(); setFav(!fav); }} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="heart" size={16} color={fav ? '#E60023' : '#000'} fill={fav ? '#E60023' : 'none'}/>
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 400, color: '#000', marginBottom: 4, lineHeight: 1.35, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{listing.title}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#000', letterSpacing: '-0.01em', marginBottom: 4 }}>{listing.price}</div>
      <div style={{ fontSize: 13, color: B.fgMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name="pin" size={12} color={B.fgMuted} strokeWidth={1.6}/>{listing.loc}
      </div>
    </div>
  );
}

window.ListingThumb = ListingThumb;
window.ListingCard = ListingCard;
