import { and, eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { createTask, getTasks } from '@/modules/ai-tasks/service';
import { danceTemplate } from './config';
import { privateHead, requireOwnedKey } from './private-storage';

export const DANCE_PROVIDER = 'dance-replicate';

export async function danceTaskId(userId: string, key: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId + '\0' + key);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  return 'dance-' + Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function ownedDanceTasks(userId: string) {
  const rows = await getTasks({ userId, mediaType: 'video', limit: 100 });
  return rows.filter((task: any) => task.provider === DANCE_PROVIDER).map(publicDanceTask);
}

export function publicDanceTask(task: any) {
  let options: Record<string, any> = {};
  let result: Record<string, any> = {};
  try { options = task.options ? JSON.parse(task.options) : {}; } catch {}
  try { result = task.taskResult ? JSON.parse(task.taskResult) : {}; } catch {}
  return {
    id: task.id, slug: options.slug || null, status: task.status,
    credits: task.costCredits, createdAt: task.createdAt,
    fileUrl: task.status === 'success' && typeof result.key === 'string'
      ? '/api/dance/file?key=' + encodeURIComponent(result.key) : null,
  };
}

export async function startDanceTask(input: {
  userId: string; slug: string; key: string; idempotencyKey: string;
}) {
  const { userId, slug, key, idempotencyKey } = input;
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) {
    throw new Error('Invalid idempotency key');
  }
  requireOwnedKey(userId, key);
  if (!/^dance\/[a-zA-Z0-9_-]+\/inputs\/[a-z0-9-]+\.(jpg|png|webp)$/.test(key)) {
    throw new Error('Select a privately uploaded photo');
  }
  const template = danceTemplate(slug);
  if (!template?.enabled || !template.model || !template.credits) {
    throw new Error('This dance template is not available yet');
  }
  const id = await danceTaskId(userId, idempotencyKey);
  const matching = async () => {
    const [existing] = await db().select().from(aiTask)
      .where(and(eq(aiTask.id, id), eq(aiTask.userId, userId))).limit(1);
    if (!existing) return null;
    const opts = JSON.parse(existing.options || '{}');
    if (opts.slug !== slug || opts.inputKey !== key) {
      throw new Error('Idempotency key was reused with different inputs');
    }
    return publicDanceTask(existing);
  };
  const prior = await matching();
  if (prior) return prior;
  if (!(await privateHead(key))) throw new Error('Photo upload was not found');
  try {
    const task = await createTask({
      id, userId, mediaType: 'video', provider: DANCE_PROVIDER,
      model: template.model, prompt: template.prompt,
      costCredits: template.credits,
      options: { slug, inputKey: key, referenceUrl: template.referenceUrl },
    });
    return publicDanceTask(task);
  } catch (error) {
    // A second request with the same key races into the primary-key constraint.
    // Return the committed task without charging twice; propagate all other failures.
    const existing = await matching();
    if (existing) return existing;
    throw error;
  }
}
