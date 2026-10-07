import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('room setup has no seat-count control and uses mode, power and next controls on one row',()=>{
  const start=html.indexOf('id="playRoomModeStep"');
  const end=html.indexOf('</section>',start);
  const block=html.slice(start,end);
  assert.doesNotMatch(html,/id="playCreateRoomSeatCount"/);
  assert.match(block,/play-room-control-row/);
  for(const marker of ['id="playRoomModeToggle"','id="playCreateRoomEnabled"','id="playRoomNextStep"'])assert.match(block,new RegExp(marker));
  assert.doesNotMatch(block,/data-play-room-mode=/);
  assert.match(css,/\.play-room-control-row\{/);
  assert.match(css,/grid-template-columns:/);
  assert.match(app,/playRoomUiState\.stage='mode'/);
  assert.match(app,/playSceneState\.roomMode==='online'\?'offline':'online'/);
});

test('hard room reset returns removed players to waiting room ready state',()=>{
  const start=worker.indexOf('async function gmRoomReset');
  const end=worker.indexOf('async function gmRoomsPurge',start);
  const block=worker.slice(start,end);
  assert.match(block,/roomCode:null,ready:true/);
  assert.doesNotMatch(block,/removedPlayers[\s\S]{0,500}roomCode:null,ready:false/);
});
