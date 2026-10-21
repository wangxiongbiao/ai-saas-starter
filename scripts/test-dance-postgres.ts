/**
 * Opt-in destructive integration test: requires a disposable PostgreSQL database
 * whose DATABASE_URL database name ends in "dance_test". Run in CI / empty test DB,
 * never production. This script only deletes rows belonging to its unique test user.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { envConfigs } from '../src/config';
import { db, closeDb } from '../src/core/db';
import { aiTask, credit, user } from '../src/config/db/schema';
import { createTask, updateTask, AITaskStatus } from '../src/modules/ai-tasks/service';
import { getBalance, grant, revoke } from '../src/modules/credits/service';

assert.equal(process.env.DANCE_PG_INTEGRATION_TEST, 'yes', 'Explicit integration-test opt-in required');
assert.ok(['postgres', 'postgresql'].includes(envConfigs.database_provider), 'PostgreSQL required');
const url = new URL(envConfigs.database_url);
assert.match(decodeURIComponent(url.pathname).replace(/^\//, ''), /(?:^|_)dance_test$/, 'Use a disposable database named dance_test or *_dance_test');
assert.equal(envConfigs.db_singleton_enabled, 'true', 'Enable DB singleton for shared pooled connections');
assert.ok(Number(envConfigs.db_max_connections) >= 12, 'Use >=12 connections to prove concurrent execution');
const dbh = db();
const id = randomUUID();
const userId = 'dance-pg-test-' + id;
const email = id + '@example.invalid';
let taskCount = 0;
const make = (taskId: string) => createTask({
  id: taskId, userId, mediaType: 'video', provider: 'dance-test',
  model: 'test', prompt: '', costCredits: 10,
  options: { inputKey: 'test-only', slug: 'love-options-dance' },
});

try {
  await dbh.insert(user).values({ id: userId, name: 'Dance PG integration', email });
  await grant({ userId, credits: 200 });

  // 16 simultaneous identical requests MUST create exactly one paid task.
  const idemId = 'dance-pg-test-idem-' + id;
  const attempts = await Promise.allSettled(Array.from({ length: 16 }, () => make(idemId)));
  const accepted = attempts.filter(x => x.status === 'fulfilled');
  assert.equal(accepted.length, 1, 'Duplicate task ID must result in exactly one successful debit');
  assert.equal(await getBalance(userId), 190);
  taskCount += 1;

  // 24 independent paid jobs compete for 190 credits (19 jobs maximum).
  // With proper row locking, exactly 19 succeed; no negative balance occurs.
  const burst = await Promise.allSettled(Array.from({ length: 24 }, (_, i) => make('dance-pg-burst-' + i + '-' + id)));
  const succeeded = burst.flatMap(x => x.status === 'fulfilled' ? [x.value] : []);
  assert.equal(succeeded.length, 19,
    'Expected exactly 19 successful jobs across concurrent debit transactions');
  assert.equal(await getBalance(userId), 0, 'Credits must never be overspent');
  taskCount += succeeded.length;

  // Multiple concurrent failure callbacks must restore just one charge.
  const failed = succeeded[0];
  const callbacks = await Promise.allSettled(Array.from({ length: 12 }, () =>
    updateTask({ taskId: failed.id, status: AITaskStatus.FAILED })));
  assert.ok(callbacks.some(c => c.status === 'fulfilled'), 'At least one failure callback should succeed');
  assert.equal(await getBalance(userId), 10);
  const refreshed = await dbh.select().from(aiTask).where(eq(aiTask.id, failed.id)).limit(1);
  assert.equal(refreshed[0]?.status, AITaskStatus.FAILED);
  await revoke(failed.creditId);
  assert.equal(await getBalance(userId), 10, 'Duplicate explicit revocation must not refund twice');

  const consumption = await dbh.select().from(credit).where(eq(credit.userId, userId));
  const records = consumption.filter((c: any) => c.transactionType === 'consume');
  assert.equal(records.length, 20, 'Every accepted job must have one consumption ledger entry');
  assert.ok(consumption.every((c: any) => c.remainingCredits >= 0), 'No negative credit lots');
  console.log('PostgreSQL concurrency checks passed', { taskCount, duplicateAttemptCount: attempts.length, independentAttemptCount: burst.length });
} finally {
  // Tests use a unique user per run; cleanup only its own children.
  await dbh.delete(aiTask).where(eq(aiTask.userId, userId));
  await dbh.delete(credit).where(eq(credit.userId, userId));
  await dbh.delete(user).where(eq(user.id, userId));
  await closeDb(envConfigs as any);
}
