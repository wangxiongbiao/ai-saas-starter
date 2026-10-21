import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { privateGet, requireOwnedKey } from '@/modules/dance/private-storage';

async function GET({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  const key = new URL(request.url).searchParams.get('key') || '';
  try {
    requireOwnedKey(session.user.id, key);
    if (!/^dance\/[a-zA-Z0-9_-]+\/(inputs|results)\/[a-z0-9-]+\.(jpg|png|webp|mp4)$/.test(key))
      throw new Error('Invalid key');
    const object = await privateGet(key);
    return new Response(object.body, {
      headers: {
        'Content-Type': key.endsWith('.mp4') ? 'video/mp4' :
          key.endsWith('.png') ? 'image/png' : key.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': key.endsWith('.mp4') ? 'attachment; filename="dance.mp4"' : 'inline',
      },
    });
  } catch {
    return new Response('File not found', { status: 404 });
  }
}
export const Route = createFileRoute('/api/dance/file')({ server: { handlers: { GET } } });
