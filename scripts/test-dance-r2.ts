/**
 * Opt-in R2/S3 private-bucket smoke test. Uses a new disposable object,
 * verifies signed GET, unsigned GET denial, and cleans up in finally.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { envConfigs } from '../src/config';
import { privatePut, privateHead, privateGet, privateDelete, signedInputUrl, requireOwnedKey } from '../src/modules/dance/private-storage';

assert.equal(process.env.DANCE_R2_INTEGRATION_TEST, 'yes', 'Explicit R2 smoke-test opt-in required');
const token = randomUUID();
const userId = 'infra-probe-' + token;
const key = 'dance/' + userId + '/inputs/' + token + '.webp';
requireOwnedKey(userId, key);
const bytes = new TextEncoder().encode('private-r2-probe:' + token);
// Test content-type storage and signed access; not a browser-upload image validation.
let put = false;
try {
  await privatePut(key, bytes, 'application/octet-stream');
  put = true;
  assert.equal(await privateHead(key), true, 'Private object missing');
  const object = await privateGet(key);
  assert.deepEqual(new Uint8Array(await object.arrayBuffer()), bytes, 'Roundtrip mismatch');
  const signed = await signedInputUrl(key);
  const signedResponse = await fetch(signed, { redirect: 'error' });
  assert.equal(signedResponse.status, 200, 'Presigned URL must grant temporary access');
  assert.deepEqual(new Uint8Array(await signedResponse.arrayBuffer()), bytes);

  const endpoint = envConfigs.storage_endpoint.replace(/\/+$/, '');
  const bucket = envConfigs.storage_bucket;
  const direct = endpoint + '/' + encodeURIComponent(bucket) + '/' + key;
  const anonymous = await fetch(direct, { redirect: 'manual' });
  assert.notEqual(anonymous.status, 200, 'Unexpected anonymous direct S3 access — bucket or endpoint is public');
  console.log('Private object storage smoke test passed (PUT/HEAD/GET/signed GET/anonymous denied/DELETE)');
} finally {
  if (put) {
    await privateDelete(key);
    assert.equal(await privateHead(key), false, 'Disposable object was not deleted');
  }
}
