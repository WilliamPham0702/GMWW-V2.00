import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
test('Gathering spacing slider supports 70–135%, synchronizes to server and updates players',()=>{
 assert.match(html,/id="playGatherSpacing" type="range" min="70" max="135" step="5"/);
 assert.match(app,/localStorage\.setItem\('gmww_gather_spacing'/);
 assert.match(app,/input\.addEventListener\('input',update\)/);
 assert.match(app,/renderPlayPlayers\(\)/);
 assert.match(app,/layout\.clampPoint\(x,y\)/);
});
test('GM info box is removed and top two audio/auto controls spread evenly',()=>{
 assert.doesNotMatch(html,/id="battleInfoToggle"/);
 assert.match(html,/id="battleGMAudio"/);assert.match(html,/id="battleGMAuto"/);
 const compact=css.slice(css.indexOf('/* V3.121 — Wolf GM tools:'));
 assert.match(compact,/display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important/);
 assert.match(compact,/overflow-x:auto!important/);
 assert.match(compact,/#battleGMAudio/);
 assert.match(compact,/#battleGMAuto/);
});
