import { AwsClient } from 'aws4fetch';
import { envConfigs } from '@/config';

/**
 * The dance bucket must be PRIVATE. Unlike the general image uploader, this
 * module never returns a permanent public object URL and never writes under /public.
 */
function storageConfig() {
  const endpoint = envConfigs.storage_endpoint.replace(/\/+$/, '');
  const bucket = envConfigs.storage_bucket;
  const accessKeyId = envConfigs.storage_access_key;
  const secretAccessKey = envConfigs.storage_secret_key;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Private dance storage is not configured');
  }
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:') throw new Error('Storage endpoint must use HTTPS');
  return {
    endpoint, bucket,
    client: new AwsClient({ accessKeyId, secretAccessKey, region: envConfigs.storage_region || 'auto', service: 's3' }),
  };
}

export function requireOwnedKey(userId: string, key: string) {
  if (!/^[a-zA-Z0-9_./-]{1,400}$/.test(key) || key.includes('..') ||
      !key.startsWith('dance/' + userId + '/')) {
    throw new Error('Invalid or unauthorized file key');
  }
  return key;
}

function objectUrl(key: string) {
  const { endpoint, bucket } = storageConfig();
  return endpoint + '/' + encodeURIComponent(bucket) + '/' +
    key.split('/').map(encodeURIComponent).join('/');
}

export async function privatePut(key: string, data: Uint8Array, type: string) {
  const { client } = storageConfig();
  const response = await client.fetch(new Request(objectUrl(key), {
    method: 'PUT',
    headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store' },
    body: data as BodyInit,
  }));
  if (!response.ok) throw new Error('Private object upload failed: ' + response.status);
}

export async function privateDelete(key: string) {
  const { client } = storageConfig();
  const response = await client.fetch(new Request(objectUrl(key), { method: 'DELETE' }));
  if (!response.ok && response.status !== 404) {
    throw new Error('Private object deletion failed: ' + response.status);
  }
}

export async function privateHead(key: string) {
  const { client } = storageConfig();
  const response = await client.fetch(new Request(objectUrl(key), { method: 'HEAD' }));
  return response.ok;
}

export async function privateGet(key: string) {
  const { client } = storageConfig();
  const response = await client.fetch(new Request(objectUrl(key), { method: 'GET' }));
  if (!response.ok) throw new Error('Private object not found');
  return response;
}

/** Temporary URL for trusted AI providers. It remains a bearer capability until expiry. */
export async function signedInputUrl(key: string) {
  const { client } = storageConfig();
  const signed = await client.sign(new Request(objectUrl(key) + '?X-Amz-Expires=3600'), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Limit input and output file size before putting it in the private bucket. */
export async function boundedDownload(url: string, maxBytes = 100 * 1024 * 1024) {
  const target = new URL(url);
  // Do not let an upstream model send the worker to internal services (SSRF).
  if (target.protocol !== 'https:' ||
      !(target.hostname === 'replicate.delivery' || target.hostname.endsWith('.replicate.delivery') ||
        target.hostname === 'pbxt.replicate.delivery')) {
    throw new Error('Unexpected AI provider output host');
  }
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok || !response.body) throw new Error('AI output download failed');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('AI output exceeds size limit');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error('AI output exceeds size limit');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return data;
}
