import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const read=path=>readFileSync(path,'utf8');
test('V3.257 Native production verification uses complete manual SHA inventory, not empty OTA',()=>{
 const s=read('.github/scripts/verify-character40-production.mjs');
 assert.equal(JSON.parse(read('package.json')).version,'3.257.0');
 assert.match(s,/ota\.releaseType==='native'/);
 assert.match(s,/ota\.ipa\?\.version,version/);
 assert.match(s,/manual-manifest\.json/);
 assert.match(s,/inventory\.runtime\.files\.find/);
 assert.match(s,/sha\(playerBytes\),sha\(localPlayerBytes\)/);
 assert.match(s,/GM low-power controller OTA SHA/);
 assert.match(s,/Player controller OTA SHA/);
 assert.doesNotMatch(s,/assert\.equal\(ota\.releaseType,'runtime'\)/);
 assert.doesNotMatch(s,/assert\.equal\(ota\.shellVersion,'3\.110'\)/);
});
test('exact Native postverify diff skips unrelated full gameplay and native IPA suites',()=>{
 const paths=[
  '.github/scripts/verify-character40-production.mjs',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/build-server-game-ipa.yml',
  'tests/gmww-v3257-native-character40-postverify.test.mjs',
  'docs/releases/GMWW-V3.257-native-postverify-20261027.md'
 ];
 const changes=paths.map((path,i)=>({path,status:i>=4?'A':'M'}));
 assert.equal(classifyBrowserScope(changes),'native-character40-postverify-3257');
 assert.notEqual(classifyBrowserScope([...changes,{path:'server-game/current/app.js',status:'M'}]),'native-character40-postverify-3257');
 assert.notEqual(classifyBrowserScope(changes.slice(1)),'native-character40-postverify-3257');
 const ci=read('.github/workflows/check-player-web.yml');
 const ipa=read('.github/workflows/build-server-game-ipa.yml');
 assert.match(ci,/steps\.scope\.outputs\.mode == 'native-character40-postverify-3257'/);
 assert.match(ipa,/needs\.scope\.outputs\.mode != 'native-character40-postverify-3257'/);
});
