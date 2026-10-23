import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, 'DATABASE_URL is required');
assert.ok(
  ['postgres', 'postgresql'].includes(process.env.DATABASE_PROVIDER || ''),
  'DATABASE_PROVIDER must be postgresql'
);

const target = new URL(databaseUrl);
assert.ok(
  ['postgres:', 'postgresql:'].includes(target.protocol),
  'DATABASE_URL must use PostgreSQL'
);
const databaseName = decodeURIComponent(target.pathname).replace(/^\//, '');
assert.match(
  databaseName,
  /(?:^|_)dance_test$/,
  'Only dance_test or *_dance_test can be baselined'
);

const migrations = readMigrationFiles({
  migrationsFolder: resolve('drizzle/postgresql'),
});
assert.equal(
  migrations.length,
  1,
  'Expected exactly one PostgreSQL baseline migration'
);
const [initial] = migrations;
const expectedSchema = `dance_baseline_${randomBytes(8).toString('hex')}`;
const apply = process.env.DANCE_PG_BASELINE_APPLY === 'yes';
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

type SchemaItem = { kind: string; name: string; definition: string };

async function schemaItems(
  tx: postgres.TransactionSql,
  schema: string
): Promise<string[]> {
  const rows = (await tx`
    SELECT 'relation' AS kind, c.relname AS name, c.relkind::text AS definition
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${schema} AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
    UNION ALL
    SELECT 'column', c.relname || '.' || a.attname,
      format_type(a.atttypid, a.atttypmod) || '|' || a.attnotnull::text || '|' ||
      COALESCE(pg_get_expr(d.adbin, d.adrelid), '')
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = ${schema} AND c.relkind IN ('r', 'p')
      AND a.attnum > 0 AND NOT a.attisdropped
    UNION ALL
    SELECT 'constraint', c.relname || '.' || k.conname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${schema}
    UNION ALL
    SELECT 'index', c.relname || '.' || i.relname, pg_get_indexdef(i.oid)
    FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
      JOIN pg_class c ON c.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${schema}
  `) as SchemaItem[];
  return rows
    .map(({ kind, name, definition }) => {
      const normalized = definition
        .replaceAll(`"${schema}".`, 'SCHEMA.')
        .replaceAll(`${schema}.`, 'SCHEMA.');
      return JSON.stringify([kind, name, normalized]);
    })
    .sort();
}

try {
  await sql.begin(async (tx) => {
    const [connection] = await tx`SELECT current_database() AS name`;
    assert.equal(
      connection.name,
      databaseName,
      'Connected database does not match DATABASE_URL'
    );
    const journal =
      await tx`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
    if (journal[0]?.name) {
      const rows =
        await tx`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
      assert.equal(
        rows[0].count,
        0,
        'Migration journal already contains entries'
      );
    }

    await tx.unsafe(`CREATE SCHEMA "${expectedSchema}"`);
    await tx`SELECT set_config('search_path', ${`"${expectedSchema}",pg_catalog`}, true)`;
    for (const statement of initial.sql) {
      await tx.unsafe(
        statement.replaceAll('"public".', `"${expectedSchema}".`)
      );
    }
    await tx`SELECT set_config('search_path', 'pg_catalog', true)`;

    const expected = await schemaItems(tx, expectedSchema);
    const actual = await schemaItems(tx, 'public');
    const missing = expected.filter((item) => !actual.includes(item));
    const extra = actual.filter((item) => !expected.includes(item));
    assert.equal(
      missing.length + extra.length,
      0,
      `Schema mismatch: ${JSON.stringify({ missing: missing.slice(0, 10), extra: extra.slice(0, 10) })}`
    );

    await tx`SET LOCAL client_min_messages TO warning`;
    await tx.unsafe(`DROP SCHEMA "${expectedSchema}" CASCADE`);
    if (!apply) return;

    await tx`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await tx`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
    )`;
    await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${initial.hash}, ${initial.folderMillis})`;
  });
  console.log(
    apply
      ? 'dance_test baseline recorded'
      : 'dance_test schema matches; no changes made'
  );
} finally {
  await sql.end();
}
