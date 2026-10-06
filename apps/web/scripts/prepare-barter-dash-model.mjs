import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';

const EXPECTED_SHA256 = '698800de4847f01df311c218abad0eb92642650f156f0ea9ff47bd65d0443d82';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const assetDir = resolve(webRoot, 'assets', 'barter-dash');
const outputDir = resolve(webRoot, 'public', 'games', 'barter-dash');

const encoded = (
  (await readFile(resolve(assetDir, 'payload.1.b64'), 'utf8')).trim() +
  (await readFile(resolve(assetDir, 'payload.2.b64'), 'utf8')).trim()
);

const packed = Buffer.from(encoded, 'base64');
const payload = brotliDecompressSync(packed);

if (payload.length < 12) {
  throw new Error('Barter Dash payload is truncated.');
}

const htmlLengthBig = payload.readBigUInt64BE(0);
if (htmlLengthBig > BigInt(Number.MAX_SAFE_INTEGER)) {
  throw new Error('Barter Dash payload has an invalid HTML length.');
}

const htmlLength = Number(htmlLengthBig);
const glbStart = 8 + htmlLength;
if (glbStart >= payload.length) {
  throw new Error('Barter Dash payload does not contain a GLB model.');
}

const glb = payload.subarray(glbStart);
if (glb.subarray(0, 4).toString('ascii') !== 'glTF') {
  throw new Error('Barter Dash mascot is not a valid GLB file.');
}

const sha256 = createHash('sha256').update(glb).digest('hex');
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Barter Dash mascot checksum mismatch: ${sha256}`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'barter-mascot-v6.glb'), glb);

console.log(`Barter Dash mascot prepared: ${glb.length} bytes, sha256 ${sha256}`);
