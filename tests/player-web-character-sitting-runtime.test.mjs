import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const js=fs.readFileSync(new URL('../server-game/current/character-renderer.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/character-renderer.css',import.meta.url),'utf8');
test('sitting is a shared runtime state for all 20 active characters',()=>{assert.match(js,/length:20/);assert.match(js,/['"]sitting['"]/);assert.match(js,/['"]sit['"]/);assert.match(js,/rendererKind\(id,\{sitting=false\}=\{\}\)\{return PROOF\.includes\(String\(id\)\)\?'segmented-skeletal':'fallback'/)});
test('seat activity routes to sitting without requiring a seated artwork',()=>{assert.match(app,/function playCharacterSitting\(member,now=playNow\(\)\)\{return Number\(member\?\.seatId/);assert.match(app,/sitting\?'sitting'/);assert.match(app,/state==='sitting'\?'sit'/);assert.doesNotMatch(app,/function playCharacterSitting[^\n]+PLAY_SEATED_CHARACTER_URLS/)});
test('sitting has visible articulated pose',()=>{for(const k of ['gmwwPlayRigSitBody','gmwwPlayRigSitLegBack','gmwwPlayRigSitLegFront','gmwwPlayRigSitArmBack','gmwwPlayRigSitArmFront'])assert.ok(css.includes(k),k);assert.match(css,/data-state="sitting"/)});
