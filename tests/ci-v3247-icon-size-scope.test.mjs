import test from 'node:test';
import assert from 'node:assert/strict';
import {isIcon247Scope,classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const allowed=[".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.247-icon-size-20261027.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/10-library-and-settings.part","server-game/src/40-battle-and-timeline.part","src/index.js","tests/gmww-action-icon-scale-setting.test.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml","tests/ci-v3247-icon-size-scope.test.mjs"];
test('V3.247 icon-only release selects targeted workflow, not full legacy checks',()=>{
 const changes=allowed.map(path=>({path,status:path.startsWith('docs/')||path==='tests/ci-v3247-icon-size-scope.test.mjs'||path==='tests/gmww-action-icon-scale-setting.test.mjs'?'A':'M'}));
 assert.equal(isIcon247Scope(changes),true);
 assert.equal(classifyBrowserScope(changes),'icon-scale-3247');
 assert.equal(isIcon247Scope(changes.filter(c=>c.path!=='src/index.js')),false);
 assert.equal(isIcon247Scope([...changes,{path:'src/gmww-seat-movement-rules.js',status:'M'}]),false);
});
