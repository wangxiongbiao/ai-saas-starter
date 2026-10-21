import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { privatePut } from '@/modules/dance/private-storage';

const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

function validImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.slice(0,8).every((b,i) => b === [137,80,78,71,13,10,26,10][i]);
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  return false;
}

async function POST({ request }: { request: Request }) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const max = 8 * 1024 * 1024;
  if (Number(request.headers.get('content-length') || 0) > max + 1_000_000)
    return Response.json({ error: 'Upload is too large' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !TYPES[file.type] || file.size < 100 || file.size > max) {
      return Response.json({ error: 'JPG, PNG or WebP required (max 8 MB)' }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImage(bytes, file.type)) return Response.json({ error: 'Invalid image data' }, { status: 400 });
    const key = 'dance/' + session.user.id + '/inputs/' + crypto.randomUUID() + '.' + TYPES[file.type];
    await privatePut(key, bytes, file.type);
    return Response.json({ data: { key, previewUrl: '/api/dance/file?key=' + encodeURIComponent(key) } }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Private upload is unavailable' }, { status: 503 });
  }
}
export const Route = createFileRoute('/api/dance/upload')({ server: { handlers: { POST } } });
