import { inArray } from 'drizzle-orm';
import { db } from '@/core/db';
import { config } from '@/config/db/schema';

/** Server-owned template configuration. Browser values never control charges or models. */
export type DanceSlug = 'love-options-dance' | 'stateside-dance';
export const DANCE_SLUGS: DanceSlug[] = ['love-options-dance', 'stateside-dance'];

export type DanceTemplate = {
  slug: DanceSlug;
  name: string;
  enabled: boolean;
  credits: number | null;
  model: string | null;
  referenceUrl: string | null;
  prompt: string;
};

const fields = ['model', 'reference_url', 'credits', 'enabled', 'prompt'] as const;
function configPrefix(slug: DanceSlug) {
  return slug === 'love-options-dance' ? 'dance_love_options_' : 'dance_stateside_';
}

export async function danceTemplate(slug: string): Promise<DanceTemplate | null> {
  if (!DANCE_SLUGS.includes(slug as DanceSlug)) return null;
  const normalized = slug as DanceSlug;
  const prefix = configPrefix(normalized);
  const vars = typeof process !== 'undefined' ? process.env : {};
  const envPrefix = normalized === 'love-options-dance' ? 'DANCE_LOVE_OPTIONS_' : 'DANCE_STATESIDE_';
  // Always read current publish state. Cached settings can allow a just-disabled
  // paid template to remain published on other server instances for an hour.
  const rows = await db().select({ name: config.name, value: config.value })
    .from(config).where(inArray(config.name, fields.map(field => prefix + field)));
  const overrides = Object.fromEntries(rows.map((row: any) => [row.name, row.value])) as Record<string, string>;
  const option = (field: typeof fields[number], envName: string): string | undefined =>
    overrides[prefix + field] ?? vars[envPrefix + envName];
  const model = option('model', 'MODEL') || null;
  const referenceUrl = option('reference_url', 'REFERENCE_URL') || null;
  const rawCredits = option('credits', 'CREDITS');
  const parsed = rawCredits === undefined || rawCredits === '' ? NaN : Number(rawCredits);
  const credits = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  const enabledByAdmin = option('enabled', 'ENABLED') === 'true';
  const ready = Boolean(
    enabledByAdmin &&
    vars.DANCE_GENERATION_ENABLED === 'true' &&
    ['postgres', 'postgresql'].includes(vars.DATABASE_PROVIDER || '') &&
    vars.STORAGE_ENDPOINT && vars.STORAGE_BUCKET &&
    vars.STORAGE_ACCESS_KEY && vars.STORAGE_SECRET_KEY &&
    vars.REPLICATE_API_TOKEN &&
    vars.DANCE_WORKER_SECRET &&
    model && referenceUrl &&
    /^https:\/\//.test(referenceUrl) &&
    credits
  );
  return {
    slug: normalized,
    name: normalized === 'love-options-dance' ? 'Love Options' : 'Stateside',
    enabled: ready,
    credits,
    model,
    referenceUrl,
    prompt: option('prompt', 'PROMPT') || 'Transfer the reference dance motion to the person in the image. Preserve identity.',
  };
}

export function danceTemplateConfigPrefix(slug: DanceSlug) {
  return configPrefix(slug);
}

export async function publicDanceTemplates() {
  const configs = await Promise.all(DANCE_SLUGS.map(danceTemplate));
  return configs.filter((x): x is DanceTemplate => Boolean(x)).map(template => ({
    slug: template.slug, name: template.name,
    enabled: template.enabled, credits: template.enabled ? template.credits : null,
  }));
}
