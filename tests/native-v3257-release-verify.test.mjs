import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const scopeFiles=[
 '.github/scripts/verify-character40-production.mjs',
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/build-server-game-ipa.yml',
 'tests/native-v3257-release-verify.test.mjs'
].map(path=>({path,status:'M'}));
test('exact V3.257 native release verifier patch gets focused CI, never runtime/IPA rebuild',()=>{
 assert.equal(classifyBrowserScope(scopeFiles),'native-manual-release-verify');
 assert.notEqual(classifyBrowserScope([...scopeFiles,{path:'src/index.js',status:'M'}]),'native-manual-release-verify');
 assert.notEqual(classifyBrowserScope([{path:scopeFiles[0].path,status:'M'}]),'native-manual-release-verify');
 const workerCI=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');
 const nativeCI=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
 assert.match(workerCI,/mode == 'native-manual-release-verify'/);
 assert.match(workerCI,/node --test tests\/native-v3257-release-verify\.test\.mjs/);
 assert.match(nativeCI,/mode != 'native-manual-release-verify'/);
});
test('Production V3.257 native inventory is checked without advertising obsolete OTA',()=>{
 const s=fs.readFileSync('.github/scripts/verify-character40-production.mjs','utf8');
 for(const x of [
  "published.releaseType==='native'",
  "published.shellVersion,version",
  "published.ipa?.version,version",
  "published.runtime?.files,[]",
  "manual-manifest.json",
  "ota.runtime.files",
  "new Set(files.map(f=>f.path)).size",
  "assert.match(String(entry.sha256||''),/^[a-f0-9]{64}$/i",
  "assert.equal(entry.url,new URL("
 ])assert.ok(s.includes(x),'Missing Native integrity guard: '+x);
 assert.ok(s.includes("published.releaseType,'runtime'"),'Legacy Runtime assertions must be preserved');
 assert.ok(s.includes("assert.equal(sha(await bytes(f.url)),expected"),'Live OTA bytes must still be SHA checked');
 assert.ok(!s.includes("assert.equal(version,'3.257'"),'Native verification must not be tied to obsolete V3.257');
 assert.ok(s.includes("assert.equal(nativeShell,version"),'Native release must match local Xcode project');
});
