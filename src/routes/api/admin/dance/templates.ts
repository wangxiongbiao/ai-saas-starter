import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { saveConfigs } from '@/modules/config/service';
import { DANCE_SLUGS, danceTemplate, danceTemplateConfigPrefix, type DanceSlug } from '@/modules/dance/config';

async function authorize(request: Request, write: boolean) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return false;
  const permission = write ? 'admin.settings.write' : 'admin.settings.read';
  return await hasPermission(session.user.id, permission) || await hasPermission(session.user.id, 'admin.*');
}

async function GET({ request }: { request: Request }) {
  if (!(await authorize(request, false))) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const templates = await Promise.all(DANCE_SLUGS.map(danceTemplate));
  return Response.json({ data: templates }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function PUT({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  if (!(await authorize(request, true))) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    const slug = body.slug as DanceSlug;
    if (!DANCE_SLUGS.includes(slug)) throw new Error('Unknown template');
    const enabled = body.enabled === true;
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    const referenceUrl = typeof body.referenceUrl === 'string' ? body.referenceUrl.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const credits = Number(body.credits);
    if (!/^[a-zA-Z0-9_.:-]+\/[a-zA-Z0-9_.:-]+$/.test(model) || model.length > 200) {
      throw new Error('Specify an existing Replicate model in owner/name format');
    }
    if (referenceUrl.length > 1500 || !referenceUrl.startsWith('https://')) {
      throw new Error('Reference action must be a valid HTTPS URL');
    }
    const url = new URL(referenceUrl);
    if (!url.hostname || url.username || url.password || url.hash)
      throw new Error('Invalid reference URL');
    if (!Number.isSafeInteger(credits) || credits < 1 || credits > 100000)
      throw new Error('Credits must be a positive integer');
    if (prompt.length < 10 || prompt.length > 1500)
      throw new Error('Prompt must be between 10 and 1500 characters');
    const prefix = danceTemplateConfigPrefix(slug);
    await saveConfigs({
      [prefix + 'enabled']: String(enabled),
      [prefix + 'model']: model,
      [prefix + 'reference_url']: referenceUrl,
      [prefix + 'credits']: String(credits),
      [prefix + 'prompt']: prompt,
    });
    return Response.json({ data: await danceTemplate(slug) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid template configuration' }, { status: 400 });
  }
}

export const Route = createFileRoute('/api/admin/dance/templates')({ server: { handlers: { GET, PUT } } });
