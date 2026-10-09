import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const script=fs.readFileSync('.github/scripts/verify-incremental-ota.mjs','utf8');
test('Production OTA verification retries temporarily unavailable Cloudflare manifest and artwork',()=>{
 assert.match(script,/async function readLiveManifest\(/);
 assert.match(script,/attempt<=14/);assert.match(script,/async function fetchImmutableAsset\(/);
 assert.match(script,/attempt<=12/);
 assert.match(script,/manifest\.releaseVersion,version/);
 assert.match(script,/assert\.equal\(hash,f\.sha256/);
 assert.match(script,/assert\.deepEqual\(manifest\.runtime\.files\.map/);
 assert.ok(!script.includes('process.exit(0) // ignore errors'));
});
