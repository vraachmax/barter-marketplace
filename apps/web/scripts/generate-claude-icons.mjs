/**
 * Build all Apple home-screen and PWA icons from the same approved Bubble B
 * SVG used in the Barter app header. No placeholder initials, blue mark or
 * handwritten copies. Generate on both predev and prebuild.
 */
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const source = path.join(publicDir, 'brand/bubble-b-v3.svg');
const outDir = path.join(publicDir, 'brand/barter-pwa-v1');
await mkdir(outDir, { recursive: true });

// The approved vector's viewBox is 96x105. An opaque white app tile is
// essential on iOS; the system draws its own rounded-corner mask.
async function icon(name, size, fill, maskable = false) {
  const height = Math.round(size * fill);
  const width = Math.round(height * 96 / 105);
  const mark = await sharp(source)
    .resize(width, height, { fit: 'contain' })
    .png()
    .toBuffer();
  const background = sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  });
  const output = path.join(outDir, name);
  await background.composite([
    { input: mark, left: Math.floor((size - width) / 2), top: Math.floor((size - height) / 2) },
  ]).png().toFile(output);
  if (maskable && fill > 0.56) throw new Error('maskable mark is outside the safe area');
}

await Promise.all([
  icon('apple-touch-icon.png', 180, 0.78),
  icon('icon-192.png', 192, 0.78),
  icon('icon-512.png', 512, 0.78),
  icon('icon-maskable-512.png', 512, 0.55, true),
  icon('favicon-32.png', 32, 0.78),
  icon('favicon-48.png', 48, 0.78),
]);
// iOS Safari also probes the conventional root path when saving a website.
// Overwrite the old icon there as a fallback, not a second source of truth.
await copyFile(path.join(outDir, 'apple-touch-icon.png'), path.join(publicDir, 'apple-touch-icon.png'));
console.log('Barter iOS and PWA icons generated from approved Bubble B SVG');
