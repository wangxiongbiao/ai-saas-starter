/** Server-owned template configuration. Never trust credits, model or status from the browser. */
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

export function danceTemplate(slug: string): DanceTemplate | null {
  if (!DANCE_SLUGS.includes(slug as DanceSlug)) return null;
  const prefix = slug === 'love-options-dance' ? 'DANCE_LOVE_OPTIONS_' : 'DANCE_STATESIDE_';
  const vars = typeof process !== 'undefined' ? process.env : {};
  const model = vars[prefix + 'MODEL'] || null;
  const referenceUrl = vars[prefix + 'REFERENCE_URL'] || null;
  const cost = Number(vars[prefix + 'CREDITS']);
  const credits = Number.isSafeInteger(cost) && cost > 0 ? cost : null;
  const ready = Boolean(
    vars[prefix + 'ENABLED'] === 'true' &&
    vars.DANCE_GENERATION_ENABLED === 'true' &&
    vars.REPLICATE_API_TOKEN &&
    vars.DANCE_WORKER_SECRET &&
    model && referenceUrl &&
    /^https:\/\//.test(referenceUrl) &&
    credits
  );
  return {
    slug: slug as DanceSlug,
    name: slug === 'love-options-dance' ? 'Love Options' : 'Stateside',
    enabled: ready,
    credits,
    model,
    referenceUrl,
    prompt: vars[prefix + 'PROMPT'] || 'Transfer the reference dance motion to the person in the image. Preserve identity.',
  };
}

export function publicDanceTemplates() {
  return DANCE_SLUGS.map(slug => {
    const template = danceTemplate(slug)!;
    return { slug: template.slug, name: template.name, enabled: template.enabled, credits: template.enabled ? template.credits : null };
  });
}
