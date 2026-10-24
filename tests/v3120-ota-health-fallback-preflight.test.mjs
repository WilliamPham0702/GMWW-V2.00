import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOtaVersionAdvance} from '../.github/scripts/verify-ota-version-advance.mjs';
const runtime={releaseVersion:'3.120',runtimeVersion:'3.120',shellVersion:'3.110',releaseType:'runtime',runtime:{files:[
...['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'].map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.120/'+path,sha256:'a'.repeat(64)}))]}};
const changed=['server-game/current/style.css'];
test('same-version OTA is rejected even if only live Worker health is available',()=>{
 assert.throws(()=>verifyOtaVersionAdvance(runtime,{releaseVersion:'3.120',source:'verified-live-health-fallback'},changed),/does not advance/);
});
test('same-version deployment is blocked when live OTA manifest is available',()=>{
 assert.throws(()=>verifyOtaVersionAdvance(runtime,{releaseVersion:'3.120'},changed),/does not advance/);
});
test('same-version health fallback cannot bypass downgrade or native release guard',()=>{
 assert.throws(()=>verifyOtaVersionAdvance(runtime,{releaseVersion:'3.121',source:'verified-live-health-fallback'},changed),/does not advance/);
 assert.throws(()=>verifyOtaVersionAdvance({...runtime,releaseType:'native'},{releaseVersion:'3.120',source:'verified-live-health-fallback'},changed),/does not advance/);
});
