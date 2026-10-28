import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
test('Gathering on iPhone uses pinch 50–300%, with no slider',()=>{
 assert.doesNotMatch(html,/id="playGatherSpacing" type="range"/);
 assert.match(html,/id="playGatherSpacingValue" class="play-pinch-indicator"/);
 assert.match(app,/pinch.startSpacing\*distance\(\)\/pinch.startDistance/);
 assert.match(app,/playUpdateRoomSettings\(\{seatSpacing:finalValue,seatOffset:finalOffset/);
 assert.match(app,/world\.addEventListener\('pointermove'/);
 assert.match(app,/world\.addEventListener\('pointercancel'/);
 assert.match(css,/#playWorld \.play-pinch-indicator\[hidden\]/);
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
