"""Run only against the dedicated postgres:16 Actions service. No Render access."""
import json
import os
from pathlib import Path
import re
import subprocess
import time

container = os.environ.get('BARTER_PG16_CONTAINER', '')
if not re.fullmatch(r'[a-f0-9]{12,64}', container):
    raise SystemExit('Expected an isolated Docker container ID')
image = subprocess.check_output(['docker', 'inspect', '--format', '{{.Config.Image}}', container], text=True).strip()
if image != 'postgres:16':
    raise SystemExit('Only the postgres:16 test service is allowed')


def run(*args, data=None):
    result = subprocess.run(['docker', 'exec', '-i', container, *args], input=data,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode())
    return result.stdout


def sql(statement, database='barter_rehearsal'):
    return run('psql', '-X', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1',
               '-qAt', data=statement.encode()).decode().strip()


version = sql('SHOW server_version_num;')
assert 160000 <= int(version) < 170000, version
locale = sql('SHOW lc_ctype;')
migrations = sorted((Path(__file__).resolve().parents[1] / 'apps/api/prisma/migrations').glob('*/migration.sql'))
assert migrations[-1].parent.name == '20260907090000_search_guard_fields'
for migration in migrations[:-1]:
    sql(migration.read_text())

sql('''
INSERT INTO "User" (id,"updatedAt",name) VALUES ('fixture-seller',now(),'Fixture');
INSERT INTO "Category" (id,"updatedAt",slug,title) VALUES ('electronics',now(),'electronics','Электроника');
INSERT INTO "Listing" (id,"updatedAt",title,description,"priceRub",city,"categoryId","ownerId")
SELECT lpad(i::text,4,'0'), timestamp '2026-09-01',
  CASE WHEN i%2=0 THEN 'Samsung S24' ELSE 'Samsung S240' END,
  'Тестовое объявление',1000,'Краснодар','electronics','fixture-seller'
FROM generate_series(1,900) AS i;
''')
snapshot_query = '''SELECT md5(string_agg(row_to_json(t)::text, '' ORDER BY id)) FROM
 (SELECT id,"createdAt","updatedAt",title,description,"priceRub",city,status,"categoryId","ownerId"
 FROM "Listing") t;'''
before = sql(snapshot_query)
backup = run('pg_dump', '-U', 'postgres', '-d', 'barter_rehearsal', '-Fc')
started = time.monotonic()
sql(migrations[-1].read_text())
elapsed = round((time.monotonic() - started) * 1000, 1)
assert sql(snapshot_query) == before, 'Customer fields changed during migration'
assert sql('SELECT count(*) FROM "Listing" WHERE "searchTokens" && ARRAY[\'s24\'];') == '450'
assert sql('''SELECT string_agg(id,',' ORDER BY id) FROM
 (SELECT id FROM "Listing" WHERE "searchTokens" && ARRAY['s24']
 AND NOT "searchAccessory" ORDER BY id OFFSET 400 LIMIT 20) t;''') == ','.join(f'{i:04}' for i in range(802,841,2))

assert json.loads(sql("SELECT to_json(barter_search_tokens('ＰＳ５ ПС5 Ёлка 205/55 R16'));")) == ['ps5','пс5','ёлка','205','55','r16']
sql('''UPDATE "Listing" SET title='Новый силиконовый чехол Samsung S24' WHERE id='0002';''')
assert sql('SELECT "searchAccessory" FROM "Listing" WHERE id=\'0002\';') == 't'
sql('''UPDATE "Listing" SET title='Samsung', description='Модель S25' WHERE id='0002';''')
assert sql('SELECT "searchTokens" && ARRAY[\'s25\'] AND NOT "searchAccessory" FROM "Listing" WHERE id=\'0002\';') == 't'
sql('''UPDATE "Listing" SET "searchTokens"=ARRAY['fake'],"searchAccessory"=true WHERE id='0002';''')
assert sql('SELECT "searchTokens" && ARRAY[\'s25\'] AND NOT "searchAccessory" FROM "Listing" WHERE id=\'0002\';') == 't'
plan = sql('''SET enable_seqscan=off; EXPLAIN SELECT id FROM "Listing" WHERE "searchTokens" && ARRAY['s24'];''')
assert 'Listing_searchTokens_idx' in plan, plan

# Restore the pre-migration full database into another isolated database.
sql('CREATE DATABASE barter_rehearsal_restore;', 'postgres')
run('pg_restore', '-U', 'postgres', '-d', 'barter_rehearsal_restore', '--exit-on-error', data=backup)
assert sql(snapshot_query, 'barter_rehearsal_restore') == before
assert sql('SELECT count(*) FROM "User";', 'barter_rehearsal_restore') == '1'
assert sql('SELECT count(*) FROM "Category";', 'barter_rehearsal_restore') == '1'
assert sql("SELECT count(*) FROM information_schema.columns WHERE table_name='Listing' AND column_name='searchTokens';", 'barter_rehearsal_restore') == '0'

# Also prove a clean installation of the complete SQL history.
sql('CREATE DATABASE barter_rehearsal_clean;', 'postgres')
for migration in migrations:
    sql(migration.read_text(), 'barter_rehearsal_clean')

print(json.dumps({'ok': True, 'serverVersionNum': int(version), 'locale': locale,
                  'migrationCount': len(migrations), 'fixtureRows': 900,
                  'migrationElapsedMsOnFixture': elapsed, 'dataPreserved': True,
                  'backupRestoreVerified': True, 'freshInstallVerified': True,
                  'deepPaginationVerified': True, 'ginPlanVerified': True}, indent=2))
