import { createFileRoute } from '@tanstack/react-router';
import { DanceVideos } from '@/blocks/dance-site';
export const Route = createFileRoute('/settings/videos')({
  head: () => ({ meta: [{ title: 'My Videos' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: DanceVideos,
});
