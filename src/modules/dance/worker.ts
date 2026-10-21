import Replicate from 'replicate';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { aiTask } from '@/config/db/schema';
import { db } from '@/core/db';
import { AITaskStatus, updateTask } from '@/modules/ai-tasks/service';
import { DANCE_PROVIDER } from './service';
import { signedInputUrl, privatePut, boundedDownload } from './private-storage';

const provider = () => {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key || process.env.DANCE_GENERATION_ENABLED !== 'true') {
    throw new Error('Dance AI generation is not enabled');
  }
  return new Replicate({ auth: key });
};

function inputField(variable: string, fallback: string) {
  const value = process.env[variable] || fallback;
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(value)) throw new Error('Invalid provider field configuration');
  return value;
}

/** A worker tick never retries a claim without an upstream ID after an uncertain API response. */
export async function runDanceWorker() {
  if (!['postgres', 'postgresql'].includes(process.env.DATABASE_PROVIDER || '')) {
    throw new Error('Dance worker requires PostgreSQL row/transaction semantics');
  }
  const ai = provider();
  const database = db();
  const pending = await database.select().from(aiTask).where(
    and(eq(aiTask.provider, DANCE_PROVIDER), eq(aiTask.status, AITaskStatus.PENDING))
  ).limit(5);

  let submitted = 0, finished = 0, unresolved = 0;
  for (const task of pending) {
    // Atomic compare-and-set: exactly one worker owns the upstream submission.
    const [claimed] = await database.update(aiTask)
      .set({ status: AITaskStatus.PROCESSING })
      .where(and(eq(aiTask.id, task.id), eq(aiTask.status, AITaskStatus.PENDING), isNull(aiTask.taskId)))
      .returning({ id: aiTask.id });
    if (!claimed) continue;
    try {
      const options = JSON.parse(task.options || '{}') as {
        slug: string; inputKey: string; referenceUrl: string;
      };
      const imageUrl = await signedInputUrl(options.inputKey);
      const imageField = inputField('DANCE_MODEL_IMAGE_FIELD', 'image');
      const referenceField = inputField('DANCE_MODEL_REFERENCE_FIELD', 'reference_video');
      if (imageField === referenceField || imageField === 'prompt' || referenceField === 'prompt') {
        throw new Error('Provider input fields cannot overlap');
      }
      if (!options.referenceUrl?.startsWith('https://')) throw new Error('Reference action is unavailable');
      const input: Record<string, string> = {
        prompt: task.prompt,
        [imageField]: imageUrl,
        [referenceField]: options.referenceUrl,
      };
      // Credentials/configuration are server-only. No user-supplied model prompt or API host.
      const prediction = await ai.predictions.create({
        model: task.model,
        input,
      } as any);
      if (!prediction.id) throw new Error('Prediction ID missing');
      await database.update(aiTask).set({
        taskId: prediction.id,
        taskInfo: JSON.stringify({ acceptedAt: new Date().toISOString() }),
      }).where(and(eq(aiTask.id, task.id), eq(aiTask.status, AITaskStatus.PROCESSING)));
      submitted += 1;
    } catch (error) {
      // A network error does not prove upstream rejection. Leave the task
      // claimed and reconcile manually instead of creating a duplicate charge.
      await database.update(aiTask).set({
        taskInfo: JSON.stringify({
          requiresReconciliation: true,
          error: error instanceof Error ? error.message.slice(0, 240) : 'Unknown submission failure',
        }),
      }).where(and(eq(aiTask.id, task.id), eq(aiTask.status, AITaskStatus.PROCESSING)));
      unresolved += 1;
    }
  }

  const active = await database.select().from(aiTask).where(and(
    eq(aiTask.provider, DANCE_PROVIDER),
    eq(aiTask.status, AITaskStatus.PROCESSING),
    isNotNull(aiTask.taskId)
  )).limit(15);

  for (const task of active) {
    try {
      const prediction = await ai.predictions.get(task.taskId!);
      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        await updateTask({
          taskId: task.id,
          status: prediction.status === 'canceled' ? AITaskStatus.CANCELED : AITaskStatus.FAILED,
        });
        finished += 1;
        continue;
      }
      if (prediction.status !== 'succeeded') continue;
      const result = prediction.output;
      const url = typeof result === 'string' ? result :
        Array.isArray(result) && typeof result[0] === 'string' ? result[0] : null;
      if (!url) throw new Error('Provider output did not contain a video URL');
      const bytes = await boundedDownload(url);
      const key = 'dance/' + task.userId + '/results/' + task.id + '.mp4';
      await privatePut(key, bytes, 'video/mp4');
      await updateTask({ taskId: task.id, status: AITaskStatus.SUCCESS, taskResult: { key } });
      finished += 1;
    } catch (error) {
      // Download/network failures are retryable; never refund a successful
      // provider job before durable storage has been verified.
      console.error('Dance task requires retry or reconciliation', task.id,
        error instanceof Error ? error.message : 'unknown error');
      unresolved += 1;
    }
  }
  return { submitted, finished, unresolved };
}
