import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const guard=readFileSync('.github/scripts/verify-character40-production.mjs','utf8');
const worker=readFileSync('src/index.js','utf8');
const project=readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
test('Production Character40 gate validates actual installed IPA, never historical V3.110',()=>{
  const workerShell=worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1];
  const xcodeShell=project.match(/MARKETING_VERSION\s*=\s*([0-9.]+);/)?.[1];
  assert.ok(workerShell);
  assert.equal(workerShell,xcodeShell);
  assert.match(guard,/assert\.equal\(published\.shellVersion,workerShell,/);
  assert.match(guard,/assert\.equal\(published\.minimumShellVersion,workerShell,/);
  assert.ok(!guard.includes("assert.equal(published.shellVersion,'3.110'"));
});
test('Production verification retains genuine OTA asset SHA-256 and Character40 checks',()=>{
  assert.match(guard,/c\.atlasSHA256/);
  assert.match(guard,/c\.originalSHA256/);
  assert.match(guard,/ota\.runtime\.files\.find/);
  assert.match(guard,/sha\(await bytes\(f\.url\)\)/);
  assert.match(guard,/assert\.equal\(catalog\.count,40\)/);
});
