import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { envConfigs } from '../src/config';
import { db, closeDb } from '../src/core/db';
import { aiTask, credit, user } from '../src/config/db/schema';
import { createTask, updateTask, findTask, AITaskStatus } from '../src/modules/ai-tasks/service';
import { grant, consume, revoke, getBalance } from '../src/modules/credits/service';

// Run only against an explicitly named disposable SQLite database.
assert.equal(envConfigs.database_provider, 'sqlite');
assert.match(envConfigs.database_url, /^file:data\/dance-backend-test\.db$/);
const userId = 'dance-backend-regression';
const database = db();
await database.delete(aiTask).where(eq(aiTask.userId, userId));
await database.delete(credit).where(eq(credit.userId, userId));
await database.delete(user).where(eq(user.id, userId));
await database.insert(user).values({ id: userId, name: 'Regression', email: 'dance-regression@example.invalid' });
const makeTask = (costCredits = 10) => createTask({ userId, mediaType: 'video', provider: 'test', model: 'test', prompt: '', costCredits, options: { imageKey: 'private/input.jpg', templateVersion: 1 } });
try {
  await grant({ userId, credits: 100 });
  const task = await makeTask();
  const saved = await findTask(task.id);
  assert.deepEqual(JSON.parse(saved.options), { imageKey: 'private/input.jpg', templateVersion: 1 });
  assert.ok(saved.creditId);
  assert.equal(task.creditId, saved.creditId);
  assert.equal(await getBalance(userId), 90);

  await updateTask({ taskId: task.id, status: AITaskStatus.PROCESSING });
  await assert.rejects(updateTask({ taskId: task.id, status: AITaskStatus.PENDING }));
  await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
  await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
  await revoke(saved.creditId);
  assert.equal(await getBalance(userId), 100);
  await updateTask({ taskId: task.id, status: AITaskStatus.SUCCESS });
  assert.equal((await findTask(task.id)).status, AITaskStatus.FAILED);

  const success = await makeTask();
  await updateTask({ taskId: success.id, status: AITaskStatus.SUCCESS, taskResult: { key: 'private/result.mp4' } });
  await updateTask({ taskId: success.id, status: AITaskStatus.FAILED });
  assert.equal((await findTask(success.id)).status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance(userId), 90);

  const canceled = await makeTask();
  await updateTask({ taskId: canceled.id, status: AITaskStatus.CANCELED });
  assert.equal(await getBalance(userId), 90);
  await assert.rejects(makeTask(-1));
  await assert.rejects(makeTask(0.5));
  await assert.rejects(makeTask(1000));
  for (const amount of [-1, 0, 0.5, Number.NaN]) {
    await assert.rejects(consume({ userId, credits: amount }));
  }
  assert.equal(await getBalance(userId), 90);

  // Legacy taskInfo linkage remains refundable.
  const legacy = await makeTask();
  await database.update(aiTask).set({ creditId: null, taskInfo: JSON.stringify({ creditId: legacy.creditId }) }).where(eq(aiTask.id, legacy.id));
  await updateTask({ taskId: legacy.id, status: AITaskStatus.FAILED });
  assert.equal(await getBalance(userId), 90);

  // A malformed refund must roll back the task transition, rather than hide the error.
  const broken = await makeTask();
  await database.update(credit).set({ consumedDetail: '[]' }).where(eq(credit.id, broken.creditId));
  await assert.rejects(updateTask({ taskId: broken.id, status: AITaskStatus.FAILED }));
  assert.equal((await findTask(broken.id)).status, AITaskStatus.PENDING);
  assert.equal(await getBalance(userId), 80);

  // Competing refunds may encounter SQLite lock contention; retrying is safe.
  const parallel = await makeTask();
  await Promise.allSettled([revoke(parallel.creditId), revoke(parallel.creditId)]);
  await revoke(parallel.creditId);
  assert.equal(await getBalance(userId), 80);

  envConfigs.database_provider = 'd1';
  await assert.rejects(makeTask(), /transactional database/);
  await assert.rejects(revoke(parallel.creditId), /transactional database/);
  await assert.rejects(consume({ userId, credits: 1 }), /transactional database/);
  envConfigs.database_provider = 'sqlite';
  console.log('Dance backend regression checks passed');
} finally {
  envConfigs.database_provider = 'sqlite';
  await database.delete(aiTask).where(eq(aiTask.userId, userId));
  await database.delete(credit).where(eq(credit.userId, userId));
  await database.delete(user).where(eq(user.id, userId));
  await closeDb(envConfigs as any);
}
