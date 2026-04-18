export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Диагностический роут: если эта страница рендерится — значит, новый deploy
 * Vercel реально приехал в браузер. Используется для проверки, когда на `/`
 * стабильно держится один и тот же error digest, несмотря на хотфиксы.
 *
 * Открыть: https://web-one-blond-66.vercel.app/build-check
 */
const BUILD_TAG = 'hotfix-diag-4 · 2026-04-18';

export default function BuildCheckPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 14,
        lineHeight: 1.5,
        color: '#0a0a0a',
        background: '#fff',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Build check
      </h1>
      <pre
        style={{
          padding: 16,
          background: '#f5f5f5',
          borderRadius: 8,
          border: '1px solid #e5e5e5',
          whiteSpace: 'pre-wrap',
        }}
      >
        {`build : ${BUILD_TAG}
time  : ${new Date().toISOString()}
route : /build-check
status: OK — если видишь этот текст, deploy Vercel приехал в браузер.`}
      </pre>
      <p style={{ marginTop: 16, color: '#525252' }}>
        Эта страница не использует ни API, ни layout-провайдеры, ни компоненты
        из feed — только чистый React. Если она открывается, а <code>/</code>{' '}
        валится — проблема в <code>layout.tsx</code> или в дочерних компонентах
        главной.
      </p>
    </main>
  );
}
