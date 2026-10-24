import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const js=fs.readFileSync(new URL('../server-game/current/character-renderer.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/character-renderer.css',import.meta.url),'utf8');
test('legacy sitting source remains available only for rollback',()=>{assert.match(js,/length:20/);assert.match(js,/['"]sitting['"]/);assert.match(js,/['"]sit['"]/);assert.match(js,/rendererKind\(id,\{sitting=false\}=\{\}\)\{return PROOF\.includes\(String\(id\)\)\?'segmented-skeletal':'fallback'/)});
test('active GM character animation no longer routes Seat occupancy to a sitting pose',()=>{const body=app.split('\n').find(l=>l.startsWith('function playCharacterAnimationCommand('));assert.ok(body);assert.doesNotMatch(body,/sitting\?'sitting'|state==='sitting'\?'sit'/);assert.match(body,/state=hanging\?\x27walking\x27:!battleStatic&&moving/);assert.match(body,/:'idle'/)});
test('legacy sitting pose is retained in the rollback assets',()=>{for(const k of ['gmwwPlayRigSitBody','gmwwPlayRigSitLegBack','gmwwPlayRigSitLegFront','gmwwPlayRigSitArmBack','gmwwPlayRigSitArmFront'])assert.ok(css.includes(k),k);assert.match(css,/data-state="sitting"/)});
