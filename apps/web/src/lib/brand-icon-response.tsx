import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The supplied artwork stays unchanged. Lay out its visible bounds, not its
// 1024px transparent canvas. Bounds include the entire blue and orange shapes.
const ART = { size: 1024, centerX: 512, centerY: 503.5, height: 839 };

export async function brandIconResponse(width: number, height = width, fill = 0.84, transparent = false) {
  const bytes = await readFile(join(process.cwd(), 'public/brand/bubble-b/barter-logo-mark-1024.png'));
  const scale = height * fill / ART.height;
  const side = ART.size * scale;
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative',
      background: transparent ? 'transparent' : '#ffffff' }}>
      {/* ImageResponse renders plain img; next/image is for the page itself. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" src={`data:image/png;base64,${bytes.toString('base64')}`}
        width={side} height={side}
        style={{ position: 'absolute', left: width / 2 - ART.centerX * scale,
          top: height / 2 - ART.centerY * scale }} />
    </div>,
    { width, height, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  );
}
