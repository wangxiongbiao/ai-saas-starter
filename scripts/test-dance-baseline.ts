import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';

assert.equal(
  process.env.DANCE_PG_INTEGRATION_TEST,
  'yes',
  'Disposable PostgreSQL opt-in required'
);
const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, 'DATABASE_URL is required');
assert.match(
  decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\//, ''),
  /(?:^|_)dance_test$/,
  'Use a disposable dance_test database'
);

const [initial] = readMigrationFiles({
  migrationsFolder: resolve('drizzle/postgresql'),
});
let sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

function baseline() {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/baseline-dance-postgres.ts'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DANCE_PG_BASELINE_APPLY: 'yes' },
      encoding: 'utf8',
      timeout: 60_000,
    }
  );
}

try {
  const marker = `baseline_test_${process.pid}`;
  await sql`INSERT INTO public.config (name, value) VALUES (${marker}, 'preserved')`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql`ALTER TABLE public.config ADD COLUMN baseline_probe text`;
  await sql.end();

  const rejected = baseline();
  assert.notEqual(
    rejected.status,
    0,
    'Mismatched schema must reject the baseline'
  );
  assert.match(
    rejected.stderr,
    /Schema mismatch/,
    'Baseline rejected for an unexpected reason'
  );
  sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  const [absent] =
    await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
  assert.equal(
    absent.name,
    null,
    'Rejected baseline created a migration journal'
  );

  await sql`ALTER TABLE public.config DROP COLUMN baseline_probe`;
  await sql.end();
  const accepted = baseline();
  assert.equal(accepted.status, 0, accepted.stderr || accepted.error?.message);

  sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  const rows =
    await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations`;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hash, initial.hash);
  assert.equal(Number(rows[0].created_at), initial.folderMillis);
  const [saved] =
    await sql`SELECT value FROM public.config WHERE name = ${marker}`;
  assert.equal(
    saved.value,
    'preserved',
    'Baseline must preserve application data'
  );
  await sql`DELETE FROM public.config WHERE name = ${marker}`;
  console.log('Dance migration baseline rejection and registration passed');
} finally {
  await sql.end();
}
