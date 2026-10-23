// Fail-closed predeployment check for Cloudflare's private preview.
// This intentionally only inspects the public configuration. Secrets are
// stored in Cloudflare Workers and must never be checked into source control.
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

const source = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const active = source.replace(/^\s*\/\/.*$/gm, '');
const productionHyperdrive = '3947cd3e7a3a4df5bb1ab8b79ea22108';
const errors = [];
const requireValue = (ok, message) => { if (!ok) errors.push(message); };
const binding = active.match(/"hyperdrive"\s*:\s*\[\s*\{([^}]*)\}\s*\]/s)?.[1] || '';
const id = binding.match(/"id"\s*:\s*"([0-9a-f]{32})"/)?.[1] || '';

requireValue(id.length === 32 && id !== productionHyperdrive,
  'An isolated preview Hyperdrive must be configured (never the production ID)');
requireValue(/"binding"\s*:\s*"HYPERDRIVE"/.test(binding),
  'The database binding must be named HYPERDRIVE');
requireValue(/"DATABASE_PROVIDER"\s*:\s*"postgresql"/.test(active),
  'The preview database must be PostgreSQL');
requireValue(/"DANCE_GENERATION_ENABLED"\s*:\s*"false"/.test(active),
  'AI generation must remain off on preview');
requireValue(/"VITE_APP_URL"\s*:\s*"https:\/\/preview\.phototodancevideo\.com"/.test(active),
  'Preview must not use the primary production hostname');
requireValue(/"bucket_name"\s*:\s*"photodance-private-preview"/.test(active),
  'Use the dedicated private R2 preview bucket');
requireValue(!/"bucket_name"\s*:\s*"photodance-private-prod"/.test(active),
  'Preview must not use the production R2 bucket');
if (errors.length) {
  for (const error of errors) console.error('Deployment blocked: ' + error);
  exit(1);
}
console.log('Preview infrastructure configuration passed. Verify that AUTH_SECRET has been added to Worker Secrets.');
