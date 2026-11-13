import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const backend=workerSource();
const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const playerWS=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const gmWS=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const gmFx=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
test('Auto GM advances zero-second turns or derives a missing server deadline',()=>{
 assert.match(backend,/const started=Date\.parse\(active\.startedAt\|\|runtime\.startedAt/);
 assert.match(backend,/started\+seconds\*1000/);
 assert.match(backend,/meta\.autoGM===false\)return 0/);
});
test('Assassin selects direct emoji buttons instead of a text prompt',()=>{
 assert.match(player,/function gmwwOnlineAssassinChoice\(/);
 assert.match(player,/for\(const choice of \['👍','👎'\]\)/);
 assert.match(player,/gmwwOnlineSubmit\(choice\)/);
 assert.doesNotMatch(player,/assassinChoice=prompt\(/);
});
test('GM refreshes private targets on sanitized WebSocket commit ticks',()=>{
 assert.match(gmWS,/battle_action_confirmed','battle_action_undone','battle_action_reverted'/);
 assert.match(gmWS,/void playSyncRoom\(true\)/);
 assert.match(playerWS,/void refreshPrivateRole\(true\)/);
 assert.match(backend,/this\.broadcast\(\{type:"battle_action_confirmed",matchId,serverTime:Date\.now\(\)\}\)/);
 assert.doesNotMatch(backend,/this\.broadcast\(\{type:"battle_action_confirmed",matchId,turnId,targets/);
 assert.match(gmFx,/playSceneRuntime\.battleUndo\?\.turnId===t\?\.id/);
});
test('Private 🧞‍♂️/🐦‍🔥 rings follow own role and selected targets, not public secrets',()=>{
 assert.match(player,/const actor=active&&id===me,target=targets\.has\(id\)/);
 assert.match(player,/orbit\.className='gmww-online-orbit gmww-sv-orbit'/);
 assert.match(player,/kind==='actor'\?'🧞‍♂️':'🐦‍🔥'/);
 assert.match(player,/@media\(prefers-reduced-motion:reduce\)/);
});
