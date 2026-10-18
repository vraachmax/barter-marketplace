// Package the existing brand artwork at the sizes referenced by metadata and PWA.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/brand/', import.meta.url));
const source = await sharp(root + 'bubble-b/barter-logo-mark-1024.png').trim().toBuffer();
const output = root + 'bubble-b-v2/';
await mkdir(output, { recursive: true });
for (const [name, width, height, fill, transparent] of [
  ['mark.png', 160, 192, .94, true],
  ['favicon-32.png', 32, 32, .84, false],
  ['favicon-48.png', 48, 48, .84, false],
  ['apple-touch-icon.png', 180, 180, .84, false],
  ['icon-192.png', 192, 192, .84, false],
  ['icon-512.png', 512, 512, .84, false],
  ['icon-maskable-512.png', 512, 512, .60, false],
]) {
  const inner = await sharp(source).resize({ width: Math.round(width * fill), height: Math.round(height * fill), fit: 'inside' }).toBuffer();
  await sharp({ create: { width, height, channels: 4, background: transparent ? '#00000000' : '#ffffff' } })
    .composite([{ input: inner, gravity: 'centre' }]).png().toFile(output + name);
}
