import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('GM/IPA renderer exposes the shared-rig batch contract for the first 20 characters',()=>{
  const source=read('server-game/current/character-renderer.js');
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(source,context);
  const api=context.window.GMWW_CHARACTER_RENDERER;
  assert.ok(api);
  assert.equal(api.version,'0.2.0');
  assert.equal(api.rendererKind('character-01'),'segmented-skeletal');
  assert.equal(api.rendererKind('character-02'),'segmented-skeletal');
  assert.equal(api.rendererKind('character-03'),'segmented-skeletal');
  assert.equal(api.rendererKind('character-04'),'segmented-skeletal');
  assert.equal(api.rendererKind('character-20'),'segmented-skeletal');
  assert.equal(api.rendererKind('character-21'),'fallback');
  assert.equal(api.proofIds.length,20);
  assert.equal(api.normalize({characterId:'character-12'}).rigId,'rig-male-muscular-v1');
  assert.equal(api.normalize({characterId:'character-13'}).rigId,'rig-male-normal-v1');
  assert.equal(api.segments.length,6);
});

test('GM app consumes semantic Character Engine state instead of frame sequencing for proof characters',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes('function playCharacterAnimationCommand'));
  assert.ok(app.includes('p?.characterAnimation?.state'));
  assert.ok(app.includes('playMountCharacterRig(host,m,{moving,sitting,effect})'));
  assert.ok(app.includes('playUpdateCharacterRig(host,m,{moving,sitting,effect})'));
  assert.ok(app.includes('rigMounted=playMountCharacterRig'));
  assert.ok(app.includes('rigUpdated=host?playUpdateCharacterRig'));
});

test('GM shell loads renderer before app and IPA build bundles both renderer files',()=>{
  const html=read('server-game/current/GMWW.html');
  const workflow=read('.github/workflows/build-server-game-ipa.yml');
  const css=read('server-game/current/character-renderer.css');
  assert.ok(html.includes('character-renderer.css?v=ce2'));
  assert.ok(html.includes('character-renderer.js?v=ce2'));
  assert.ok(html.indexOf('character-renderer.js?v=ce2')<html.indexOf('app.js'));
  assert.ok(workflow.includes('cp server-game/current/character-renderer.js "$APPDIR/Web/character-renderer.js"'));
  assert.ok(workflow.includes('cp server-game/current/character-renderer.css "$APPDIR/Web/character-renderer.css"'));
  assert.ok(css.includes('@keyframes gmwwPlayRigLegA'));
  assert.ok(css.includes('@keyframes gmwwPlayRigBreathe'));
  assert.ok(css.includes('[data-rig-id="rig-male-normal-v1"]'));
  assert.doesNotMatch(css,/scaleX\s*\(/);
});

test('GM renderer uses one shared idle scheduler and no frame sequencing loop',()=>{
  const renderer=read('server-game/current/character-renderer.js');
  assert.equal((renderer.match(/setInterval\s*\(/g)||[]).length,1);
  assert.doesNotMatch(renderer,/requestAnimationFrame\s*\(/);
  assert.doesNotMatch(renderer,/frame-(?:02|03|04|05|06)/);
  assert.ok(renderer.includes('LIVE_IDLE_ROOTS'));
  assert.ok(renderer.includes('liveIdleMotionAt'));
});
