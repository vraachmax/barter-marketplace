/**
 * Убирает однотонный светлый фон у PNG в public/icons (почти белый / низкая насыщенность).
 * Запуск: node scripts/strip-icon-background.mjs
 */
import { readdir, readFile, writeFile, rename, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '../public/icons');

/** Пиксель считаем «фоном», если RGB высокие и цвет почти серый (мало насыщенности) */
const RGB_MIN = 220;
const SAT_MAX = 0.12;

function processBuffer(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (r >= RGB_MIN && g >= RGB_MIN && b >= RGB_MIN && sat <= SAT_MAX) {
      data[i + 3] = 0;
    }
  }
}

async function main() {
  let files;
  try {
    files = (await readdir(ICONS_DIR)).filter((f) => f.endsWith('.png'));
  } catch {
    console.error('Папка не найдена:', ICONS_DIR);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error('Нет .png в', ICONS_DIR);
    process.exit(1);
  }

  for (const f of files) {
    const filePath = path.join(ICONS_DIR, f);
    const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) {
      console.warn('Пропуск (ожидаем RGBA):', f);
      continue;
    }
    processBuffer(data);
    const tmp = filePath + '.tmp.png';
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(tmp);
    await unlink(filePath);
    await rename(tmp, filePath);
    console.log('OK', f);
  }
  console.log('Готово:', files.length, 'файлов');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
