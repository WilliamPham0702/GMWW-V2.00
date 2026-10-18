import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('V3.134: compact room controls keep both toggles and arrow adjacent',()=>{
  const css=read('server-game/current/style.css');
  const rule=css.slice(css.lastIndexOf('/* V3.134:'));
  assert.ok(rule.startsWith('/* V3.134:'));
  assert.match(rule,/\.play-room-control-row\{\s*display:flex!important/);
  assert.match(rule,/justify-content:flex-start!important/);
  assert.match(rule,/width:max-content!important;max-width:100%!important;margin:0!important/);
  assert.match(rule,/\.play-room-control-row>\.play-room-step-next\{\s*flex:0 0 42px!important;margin:0!important/);
});

test('V3.134: room tiles scroll horizontally without widening the modal; cache key matches runtime',()=>{
  const css=read('server-game/current/style.css');
  const rule=css.slice(css.lastIndexOf('/* V3.134:'));
  assert.match(rule,/\.play-room-picker-card\{min-width:0!important;overflow:hidden!important\}/);
  assert.match(rule,/\.play-room-strip\{[\s\S]*?overflow-x:auto!important;overflow-y:hidden!important/);
  assert.match(rule,/scroll-snap-type:x proximity/);
  assert.match(rule,/\.play-room-created-list\{[\s\S]*?width:max-content!important/);
  const version=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
  const html=read('server-game/current/GMWW.html');
  assert.ok(html.includes('style.css?v='+version+'-compact-room'));
  assert.ok(html.includes('app.js?v='+version+'-compact-room'));
});
