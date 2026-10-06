import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';

const EXPECTED_FOX_SHA256 = '0934f1106238db33cca9796c3cc588adedf9d13ce51acfcb88a7778e52815c93';
const EXPECTED_MONSTER_SHA256 = '7f937fa053d530126fcb76449e75387a667614bc36d725c8e9a36c6c4f4a2e84';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const assetDir = resolve(webRoot, 'assets', 'barter-dash');
const gameDir = resolve(webRoot, 'public', 'games', 'barter-dash');
const modelDir = resolve(gameDir, 'models');

const partNames = [
  'v2-payload.1.b64',
  'v2-payload.2.b64',
  'v2-payload.3.b64',
  'v2-payload.4.1.b64',
  'v2-payload.4.2.b64',
  'v2-payload.4.3.b64',
  'v2-payload.4.4.b64',
];

const encodedParts = await Promise.all(
  partNames.map(async (name) => (await readFile(resolve(assetDir, name), 'utf8')).replace(/\s+/g, '')),
);
const packed = Buffer.from(encodedParts.join(''), 'base64');
const decoded = brotliDecompressSync(packed);

if (decoded.length < 16) throw new Error('Barter Dash v2 model bundle is truncated.');

const foxLength = Number(decoded.readBigUInt64BE(0));
const monsterLength = Number(decoded.readBigUInt64BE(8));
const foxStart = 16;
const monsterStart = foxStart + foxLength;
const end = monsterStart + monsterLength;

if (!Number.isSafeInteger(foxLength) || !Number.isSafeInteger(monsterLength) || foxLength <= 0 || monsterLength <= 0 || end !== decoded.length) {
  throw new Error('Barter Dash v2 model bundle has invalid lengths.');
}

const fox = decoded.subarray(foxStart, monsterStart);
const monster = decoded.subarray(monsterStart, end);

function verifyModelModule(label, bytes, expectedSha256) {
  if (!bytes.subarray(0, 32).toString('utf8').startsWith('export default "')) {
    throw new Error(`Barter Dash ${label} model module is invalid.`);
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== expectedSha256) throw new Error(`Barter Dash ${label} checksum mismatch: ${sha256}`);
  return sha256;
}

const foxSha256 = verifyModelModule('fox', fox, EXPECTED_FOX_SHA256);
const monsterSha256 = verifyModelModule('monster', monster, EXPECTED_MONSTER_SHA256);

await mkdir(modelDir, { recursive: true });
await Promise.all([
  writeFile(resolve(modelDir, 'barter-fox-v2.js'), fox),
  writeFile(resolve(modelDir, 'barter-mascot-v6.js'), monster),
  rm(resolve(gameDir, 'barter-mascot-v6.glb'), { force: true }),
]);

console.log(`Barter Dash v2 models prepared: fox ${fox.length} B (${foxSha256}), monster ${monster.length} B (${monsterSha256})`);