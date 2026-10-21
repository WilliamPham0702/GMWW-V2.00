import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(name,'utf8');
const css = read('server-game/current/style.css');
const html = read('server-game/current/GMWW.html');
const battle = read('server-game/src/40-battle-and-timeline.part');
const gm = read('server-game/current/app.js');
const version = JSON.parse(read('package.json')).version.replace(/\.0$/,'');
const region = css.slice(css.indexOf('/* V3.178 — compact battle chrome:'), css.indexOf('/* V3.179 —'));

test('V3.178: battle panel rules are scoped and preserve full-width rails',()=>{
 assert.ok(region.startsWith('/* V3.178 — compact battle chrome:'));
 for(const id of ['#playBattleTop','#battleTimeline','#battleDemoObserver','#battleWolfMenu','#battleBottomControls','#battleActionTray','#battleDemoToggle','#battleDemoSpeed','#battleDetails'])
  assert.ok(region.includes(id), 'missing: '+id);
 assert.match(css,/--gmww-rail-width:min\(680px,calc\(100vw - 24px\)\)/);
 assert.match(region, /#battleBottomControls\s*\{/);
 assert.match(region, /#battleWolfMenu:not\(\.gmww-dock-snapped\)/);
 assert.match(region, /#battleDemoObserver:not\(\.gmww-dock-snapped\)/);
 assert.doesNotMatch(region, /play-player-token|play-player-avatar|\.play-world\{|\.stage\{|background-image/);
});
test('V3.178: independent draggable DEMO panel and action scrolling stay accessible',()=>{
 assert.match(battle,/battleBindAuxiliaryDrag\('battleDemoObserver','header'\)/);
 assert.match(battle,/battleBindAuxiliaryDrag\('battleWolfMenu','header'\)/);
 assert.match(region, /#battleDemoObserver>header\s*\{/);
 assert.match(region, /overflow-y:auto!important/);
 assert.match(region, /#battleDemoToggle\s*\{/);
 assert.match(region, /#battleDemoSpeedWrap\s*\{/);
 assert.match(region, /#battleBottomControls #battleActionBar>button\[data-battle-action\]/);
 assert.match(region, /min-height:44px!important/);
 assert.match(html,/id="battleDemoObserver"/);
 assert.match(html,/id="battleActionBar"/);
});
test('V3.178: shell, GM, Player Worker versions match without native IPA changes',()=>{
 assert.ok(read('src/index.js').includes('VERSION="V'+version+'"'));
 assert.ok(read('src/index.js').includes('UPDATE_CHANNEL_REV="runtime-'+version.replace('.','')+'"'));
 assert.ok(gm.includes("const VERSION='"+version+"'"));
 assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+version+"'"));
 assert.ok(html.includes('<title>GMWW V'+version+'</title>'));
 assert.ok(html.includes('style.css?v='+version+'-compact-room'));
 assert.ok(html.includes('app.js?v='+version+'-compact-room'));
});
