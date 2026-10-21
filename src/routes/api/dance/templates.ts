import { createFileRoute } from '@tanstack/react-router';
import { publicDanceTemplates } from '@/modules/dance/config';

export const Route = createFileRoute('/api/dance/templates')({
  server: { handlers: { GET: async () => Response.json({ data: publicDanceTemplates() }, {
    headers: { 'Cache-Control': 'no-store' },
  }) } },
});
