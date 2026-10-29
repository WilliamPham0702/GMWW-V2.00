#!/usr/bin/env node
// Fail closed before GitHub Actions publishes a GMWW PR Preview.
// No Worker deployments or production bindings are modified by this script.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const c = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
assert.equal(c.name, 'gmww-v2-00', 'Unexpected Worker: refuse Preview');
assert.equal(c.main, 'src/index.js', 'Unexpected Worker entry: refuse Preview');
assert.ok(c.assets?.directory === './assets', 'Unexpected static assets directory');
assert.ok(c.previews && typeof c.previews === 'object', 'Missing Preview config');
const keys = Object.keys(c.previews).sort();
assert.deepEqual(keys, ['durable_objects'], 'Unexpected Preview binding; audit before enabling');
assert.deepEqual(c.previews.durable_objects?.bindings, [
  {name: 'ROOMS', class_name: 'RoomDurableObject'}
], 'ROOMS must use the Cloudflare Preview-isolated DO namespace');
for (const key of ['routes', 'route', 'triggers', 'kv_namespaces', 'd1_databases',
  'r2_buckets', 'services', 'queues', 'workflows', 'hyperdrive', 'secrets_store']) {
  assert.ok(!(key in c.previews), 'Forbidden shared or production Preview binding: ' + key);
}
console.log('PASS: Preview-only Wrangler config, isolated ROOMS DO, no production data bindings');
