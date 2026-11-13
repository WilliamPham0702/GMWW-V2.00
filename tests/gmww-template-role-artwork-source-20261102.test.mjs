import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fetchCanonicalRoleArtwork, LAST_PACKAGED_ROLE_ARTWORK_VERSION} from '../src/gmww-template-artwork-source.js';

const origin = 'https://gmww-v2-00.example.workers.dev/';
function harness(statuses) {
  const calls = [];
  const assets = {
    fetch: async request => {
      const url = new URL(request.url);
      calls.push(url.pathname);
      const version = url.pathname.match(/^\/updates\/runtime\/(V[0-9.]+)\//)?.[1];
      return new Response(null, {status: statuses[version] ?? 404});
    }
  };
  return {calls, assets};
}
const paths = h => h.calls.map(p => p.split('/').slice(-2).join('/'));

test('Ván Mẫu uses the exact current-runtime role artwork when packaged', async () => {
  const h = harness({'V3.289': 200, 'V3.119': 200});
  const response = await fetchCanonicalRoleArtwork(h.assets, origin, 'role_wolf', 'V3.289');
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0], /\/V3\.289\/assets\/role-artwork-v251\/original\/role_wolf\.webp$/);
});

test('Ván Mẫu finds original Sói Thường artwork in immutable last-packaged bundle', async () => {
  const h = harness({'V3.289': 404, 'V3.119': 200});
  const response = await fetchCanonicalRoleArtwork(h.assets, origin, 'role_wolf', 'V3.289');
  assert.equal(response.status, 200);
  assert.deepEqual(h.calls.map(p => p.match(/\/runtime\/(V[0-9.]+)\//)?.[1]), ['V3.289', 'V3.119']);
  assert.ok(h.calls.every(p => p.endsWith('/role_wolf.webp')), 'Never substitute another role image');
});

test('A missing image remains an error, not a false success or fabricated placeholder', async () => {
  const h = harness({'V3.289': 404, 'V3.119': 404});
  assert.equal((await fetchCanonicalRoleArtwork(h.assets, origin, 'role_custom', 'V3.289')).status, 404);
  assert.equal(h.calls.length, 2);
});

test('A 503 in current runtime does not silently fetch stale artwork', async () => {
  const h = harness({'V3.289': 503, 'V3.119': 200});
  assert.equal((await fetchCanonicalRoleArtwork(h.assets, origin, 'role_wolf', 'V3.289')).status, 503);
  assert.equal(h.calls.length, 1);
});

test('Role card assets for 3-player AUTO VÁN exist and retain WebP identity', () => {
  for (const role of ['role_wolf', 'role_villager', 'role_seer']) {
    const file = 'assets/updates/runtime/' + LAST_PACKAGED_ROLE_ARTWORK_VERSION +
      '/assets/role-artwork-v251/original/' + role + '.webp';
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4), 'RIFF', role);
    assert.equal(bytes.toString('ascii',8,12), 'WEBP', role);
    assert.ok(bytes.length > 32 && bytes.length <= 1380000, role + ' must satisfy Worker size contract');
  }
});

test('Both GM preview endpoint and canonical template package resolve through the same source', () => {
  const worker = workerSource();
  assert.match(worker,/fetchCanonicalRoleArtwork\(env\.ASSETS,request\.url,templateRoleArtwork\[1\],VERSION\)/);
  assert.match(worker,/fetchCanonicalRoleArtwork\(env\.ASSETS,request\.url,roleId,VERSION\)/);
  assert.match(worker,/CANONICAL_ROLE_ARTWORK_MISSING/);
});
