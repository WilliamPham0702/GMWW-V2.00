import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersPage} from '../src/gmww-members-page.js';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

const page=gmwwMembersPage('TEST01');
const source=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');

test('first paint is gated in the HTML head before any screen markup',()=>{
  const head=page.slice(0,page.indexOf('</head>'));
  assert.match(page,/<html lang="vi" data-gmww-boot="pending">/);
  assert.match(head,/<style id="gmww-player-first-paint">/);
  assert.match(head,/html\[data-gmww-boot="pending"\] \.app > \.screen\{visibility:hidden!important;pointer-events:none!important\}/);
  assert.ok(page.indexOf('id="gmww-player-first-paint"')<page.indexOf('<body'));
  assert.match(head,/#game \.game-top,#game \.role-hint,#game \.game-status,#gmwwGameViewTabs\{display:none!important\}/);
  assert.match(head,/#game \.role-stage\[hidden\]\{display:none!important\}/);
});

test('no old static Online sample rooms or fake players are rendered',()=>{
  assert.match(page,/<section id="rooms" class="screen">/);
  assert.match(page,/<div class="room-list" aria-live="polite"><\/div>/);
  assert.doesNotMatch(page,/id="roomA"|Mã Z3ZAPP|Mã WOLF88|Thành Phố Sói/);
  assert.doesNotMatch(page,/onclick="joinRoom\('roomA'\)"/);
  assert.match(gmwwMembersLiveScript,/function renderRooms\(\)/);
  assert.match(gmwwMembersLiveScript,/list\.innerHTML='';/);
});

test('game retains functional card slots but cannot show fake Tiên Tri on load',()=>{
  const game=page.slice(page.indexOf('<section id="game"'),page.indexOf('<!-- Offline-only demo controller -->'));
  assert.match(game,/id="roleCard"/);
  assert.match(game,/class="role-name">Vai Trò<\/div>/);
  assert.match(game,/<div class="role-art"><img alt="Vai Trò" decoding="async"><\/div>/);
  assert.doesNotMatch(game,/src="data:image\/|>TIÊN TRI<|PHE • Phe Dân/);
  assert.match(gmwwMembersLiveScript,/function renderRole\(\)/);
  assert.match(gmwwMembersLiveScript,/role\.hidden=pane!=='role'/);
});

test('bootstrap exposes only the selected screen; login and village routes preserved',()=>{
  assert.match(source,/el\.classList\.add\('active'\);state\.activeScreenId=id;/);
  assert.match(source,/document\.documentElement\.dataset\.gmwwBoot='ready'/);
  assert.ok(source.indexOf("state.activeScreenId=id;") < source.indexOf("dataset.gmwwBoot='ready'"));
  assert.match(source,/async function enterVillage\(\)/);
  assert.match(source,/go\('game'\);setGameViewPane\('village'/);
  assert.match(page,/id="login" class="screen active"/);
  assert.match(page,/id="profile" class="screen"/);
  assert.match(page,/id="game" class="screen"/);
  assert.match(gmwwMembersPage('A&B'),/data-target-room="A&amp;B"/);
});
