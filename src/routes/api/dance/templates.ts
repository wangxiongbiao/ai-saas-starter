import { createFileRoute } from '@tanstack/react-router';

import { publicDanceTemplates } from '@/modules/dance/config';
import { respData } from '@/lib/resp';

async function GET() {
  try {
    const response = respData(await publicDanceTemplates());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    console.error('Dance template query failed', {
      message: error instanceof Error ? error.message : String(error),
      cause: cause instanceof Error ? cause.message : undefined,
      code:
        cause && typeof cause === 'object' && 'code' in cause
          ? cause.code
          : undefined,
    });
    throw error;
  }
}

export const Route = createFileRoute('/api/dance/templates')({
  server: { handlers: { GET } },
});
