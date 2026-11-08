// Rebuild Prisma Client from the schema of this workspace before Nest compilation.
// Works for hoisted and nested npm workspace dependency layouts.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.dirname(require.resolve('prisma/package.json', { paths: [path.resolve(__dirname, '..')] }));
const prismaCli = path.join(root, 'build', 'index.js');
const schema = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const result = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', schema], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
