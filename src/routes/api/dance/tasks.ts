import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { ownedDanceTasks, startDanceTask } from '@/modules/dance/service';

async function GET({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ data: await ownedDanceTasks(session.user.id) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
async function POST({ request }: { request: Request }) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const result = await startDanceTask({
      userId: session.user.id,
      slug: typeof body.slug === 'string' ? body.slug : '',
      key: typeof body.key === 'string' ? body.key : '',
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
    });
    return Response.json({ data: result }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create video';
    const status = /Insufficient credits/.test(message) ? 402 : 400;
    return Response.json({ error: message }, { status });
  }
}
export const Route = createFileRoute('/api/dance/tasks')({ server: { handlers: { GET, POST } } });
