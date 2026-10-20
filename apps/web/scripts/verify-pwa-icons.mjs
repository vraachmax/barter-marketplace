// Stable and committed icons. Never rely on prebuild to generate them.
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets=[
  ['public/brand/barter-pwa-v3/apple-touch-icon.png',180],
  ['public/brand/barter-pwa-v3/icon-192.png',192],
  ['public/brand/barter-pwa-v3/icon-512.png',512],
  ['public/brand/barter-pwa-v3/icon-maskable-512.png',512],
  ['public/brand/barter-pwa-v3/favicon-32.png',32],
  ['public/brand/barter-pwa-v3/favicon-48.png',48],
  ['public/apple-touch-icon.png',180],
  ['src/app/apple-icon.png',180],
];
let apple;
for(const [name,size] of assets){
  const data=await readFile(join(root,name));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Invalid PNG: '+name);
  assert.equal(data.readUInt32BE(16),size,'Wrong icon width: '+name);
  assert.equal(data.readUInt32BE(20),size,'Wrong icon height: '+name);
  if(name.includes('apple-touch-icon')||name.includes('apple-icon')){
    if(!apple)apple=data;
    assert(data.equals(apple),'Apple icons must all be the same committed artwork: '+name);
  }
}
console.log('Committed Barter app icons verified ('+assets.length+' PNGs).');
