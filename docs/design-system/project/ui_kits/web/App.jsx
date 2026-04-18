/* global React, ReactDOM */

function App() {
  const B = window.BRAND;
  const [query, setQuery] = React.useState('');
  const [activeListing, setActiveListing] = React.useState(null);
  const openListing = (l) => { setActiveListing(l); window.scrollTo(0, 0); };

  return (
    <div style={{ background: B.page, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header query={query} setQuery={setQuery} onGoHome={() => setActiveListing(null)}/>
      <div data-screen-label={activeListing ? 'listing' : 'home'} style={{ flex: 1 }}>
        {activeListing
          ? <ListingDetail listing={activeListing} onBack={() => setActiveListing(null)}/>
          : <HomePage listings={window.MOCK_LISTINGS} onOpenListing={openListing}/>}
      </div>
      <Footer/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
