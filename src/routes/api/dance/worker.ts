import { createFileRoute } from '@tanstack/react-router';
import { runDanceWorker } from '@/modules/dance/worker';

function equalsToken(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function POST({ request }: { request: Request }) {
  const expected = process.env.DANCE_WORKER_SECRET || '';
  const received = request.headers.get('authorization') || '';
  if (!expected || !equalsToken(received, 'Bearer ' + expected))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json({ data: await runDanceWorker() }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Dance worker failed', error);
    return Response.json({ error: 'Worker not ready' }, { status: 503 });
  }
}
export const Route = createFileRoute('/api/dance/worker')({
  server: { handlers: { POST } },
});
