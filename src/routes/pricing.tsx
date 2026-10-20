import { createFileRoute } from '@tanstack/react-router';
import { DancePricing } from '@/blocks/dance-site';
import { envConfigs } from '@/config';
import { localizeUrl } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: 'Credit Pricing' + ' | ' + envConfigs.app_name },
      { name: 'description', content: 'Explore photo-to-dance templates. Single-person photos, planned 9:16 MP4 output and no music included. Generation is coming soon.' },
      { name: 'robots', content: 'noindex, follow' },
    ],
    links: [{ rel: 'canonical', href: localizeUrl(envConfigs.app_url + '/pricing').href }],
  }),
  component: () => <DancePricing />,
});
