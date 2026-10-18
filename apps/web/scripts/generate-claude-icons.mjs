/** Generate production PWA icons from the exact approved Claude mark.
 * The committed mark is the single source of truth. No AI regeneration.
 * Run before both Next dev and production build.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public/brand/claude-mark.png');
const dir = path.join(root, 'public/brand/claude-pwa');
await mkdir(dir, { recursive: true });

async function icon(name, size, scale = 0.68, background = '#ffffff', maskable = false) {
  const markH = Math.round(size * scale);
  const markW = Math.round(markH * 179 / 199);
  const mark = await sharp(source).resize(markW, markH, { fit: 'contain' }).png().toBuffer();
  // The maskable mark stays within Android's safe radius (40% of width).
  const base = sharp({ create: { width:size, height:size, channels:4, background } });
  await base.composite([{input:mark,left:Math.floor((size-markW)/2),top:Math.floor((size-markH)/2)}]).png().toFile(path.join(dir,name));
}
await Promise.all([
  icon('icon-192.png',192,0.65),
  icon('icon-512.png',512,0.65),
  icon('icon-maskable-512.png',512,0.53,'#ffffff',true),
  icon('apple-touch-icon.png',180,0.65),
  icon('favicon-32.png',32,0.70,'#ffffff'),
  icon('favicon-48.png',48,0.70,'#ffffff'),
]);
console.log('Claude brand PWA icons prepared from approved original.');
