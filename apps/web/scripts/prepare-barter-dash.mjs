import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const sourceDir = resolve(webRoot, 'assets', 'barter-dash');
const targetDir = resolve(webRoot, 'public', 'games', 'barter-dash');

const encoded = (
  (await readFile(resolve(sourceDir, 'payload.1.b64'), 'utf8')).trim() +
  (await readFile(resolve(sourceDir, 'payload.2.b64'), 'utf8')).trim()
);

const payload = brotliDecompressSync(Buffer.from(encoded, 'base64'));
if (payload.length < 12) throw new Error('Barter Dash payload is truncated.');

const htmlLengthBig = payload.readBigUInt64BE(0);
if (htmlLengthBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Barter Dash HTML length is invalid.');
const htmlLength = Number(htmlLengthBig);
const htmlStart = 8;
const glbStart = htmlStart + htmlLength;

if (glbStart >= payload.length) throw new Error('Barter Dash payload has no GLB asset.');
const html = payload.subarray(htmlStart, glbStart);
const glb = payload.subarray(glbStart);

if (glb.subarray(0, 4).toString('ascii') !== 'glTF') {
  throw new Error('Barter Dash mascot is not a valid GLB file.');
}

await mkdir(targetDir, { recursive: true });
await Promise.all([
  writeFile(resolve(targetDir, 'index.html'), html),
  writeFile(resolve(targetDir, 'barter-mascot-v6.glb'), glb),
]);

console.log(`Barter Dash prepared: ${html.length} B HTML, ${glb.length} B GLB`);
