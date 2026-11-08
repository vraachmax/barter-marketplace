const test = require('node:test');
const assert = require('node:assert/strict');
const {ACCEPTED,SEARCH_TERMS} = require('./commons-demo-photos.cjs');
test('all 30 listings have a specific real-photo search query',()=>{
  assert.equal(SEARCH_TERMS.length,30);
  assert.equal(new Set(SEARCH_TERMS).size,30);
});
test('noncommercial or no-derivatives images are forbidden',()=>{
  for (const license of ['CC BY-NC 4.0','CC BY-ND 4.0','CC BY-NC-SA 3.0','All rights reserved','CC BY-SA 4.0 / unknown']) {
    assert.equal(ACCEPTED.test(license),false,license);
  }
});
test('known reusable photo licenses accepted',()=>{
  for (const license of ['CC0','CC0 1.0','CC BY 4.0','CC BY-SA 4.0','Public domain'])
    assert.equal(ACCEPTED.test(license),true,license);
});
