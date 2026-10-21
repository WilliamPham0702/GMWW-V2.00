import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8'),html=fs.readFileSync('server-game/current/GMWW.html','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
test('Demo controls stay inside GM campfire instead of an external collapsing overlay',()=>{
  const menu=html.indexOf('id="battleWolfMenu"'),panel=html.indexOf('id="battleDemoPanel"'),actions=html.indexOf('class="battle-wolf-actions"');
  assert.ok(menu>=0&&panel>menu&&panel<actions);
  assert.doesNotMatch(setup,/demoPanelState/);
  assert.match(css,/#battleWolfMenu #battleDemoPanel/);
  assert.match(html,/id="battleDemoToggle"/);
});