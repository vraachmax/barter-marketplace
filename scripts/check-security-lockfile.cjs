// Fail closed if the committed lockfile does not contain patched security minima.
// This guard does not replace OSV; it protects against stale lockfile regression.
const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const packages = lock.packages || {};
const minimum = {
  next:'16.4.1', multer:'2.5.0', 'body-parser':'2.4.0',
  qs:'6.16.1', undici:'6.29.1', zod:'4.6.6',
  'follow-redirects':'1.16.2',
};
function compare(a,b) {
  const x=a.split('.').map(Number), y=b.split('.').map(Number);
  for(let i=0;i<3;i++) { if((x[i]||0)!==(y[i]||0)) return (x[i]||0)-(y[i]||0); }
  return 0;
}
let failures=0;
for(const [name,version] of Object.entries(minimum)) {
  const matches=Object.entries(packages).filter(([path])=>path==='node_modules/'+name || path.endsWith('/node_modules/'+name));
  if(!matches.length) continue;
  for(const [path,pkg] of matches) {
    if(compare(pkg.version,version)<0) {
      console.error('UNPATCHED',name,pkg.version,'requires >=',version,'at',path); failures++;
    }
  }
}
const root = require('../package.json');
if(Object.keys(root.overrides||{}).some(key=>key==='multer' || key.startsWith('multer@'))) {
  console.error('Unexpected Multer override in root package.json'); failures++;
}
if(failures) { console.error('Security lockfile gate FAILED:',failures,'unpatched locations'); process.exit(1); }
console.log('Security minimum-version gate passed. Full OSV scan still required.');
