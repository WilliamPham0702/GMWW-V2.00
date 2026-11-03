import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gm=readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
const live=readFileSync(new URL('../server-game/src/30-village-and-setup.part',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');

test('Gallows audio queue persists across every stage of the same day',()=>{
 const start=gm.indexOf('function battleQueueDayAudio(cues){');
 const end=gm.indexOf('function battleMorningPlayAudio()',start);
 assert.ok(start>=0&&end>start);
 const queue=gm.slice(start,end);
 assert.match(queue,/playSceneRuntime\.room\?\.cycleStartedAt/);
 assert.doesNotMatch(queue,/playSceneRuntime\.gallows\?\.stage/);
 assert.match(queue,/queue\.items\.push\(\.\.\.cues\)/);
});

test('Auto GM emits all public stage audio including nomination closure and vote opening',()=>{
 assert.match(gm,/audio_system_gallows_open_nomination/);
 assert.match(gm,/audio_system_gallows_nomination_result/);
 assert.match(gm,/audio_system_gallows_open_vote/);
 assert.match(gm,/audio_system_gallows_vote_result/);
 assert.match(gm,/gallowsStageAudioKey/);
 assert.match(gm,/stage==='selecting'/);
});

test('Auto GM realtime cue retries only matching active Server role turn',()=>{
 assert.match(live,/d\.type==='night_turn'&&d\.source==='auto'/);
 assert.match(live,/String\(playSceneRuntime\.nightRuntime\?\.currentId\|\|''\)!==expected/);
 assert.match(live,/battleAudioForTurn\(battleTurn\(\),true\)/);
 assert.match(live,/battleState\.audioPendingTurnKey===battleState\.key/);
});

test('Night transition is contingent on persisted completed Gallows verdict',()=>{
 assert.match(worker,/source==="auto"&&ballot\?\.stage!=="resolved"/);
 assert.match(worker,/stage==="nominating"[\s\S]*stage==="selecting"[\s\S]*stage==="voting"[\s\S]*stage==="resolved"/);
 assert.match(worker,/gallowsBegin\(ballot,String\(ballot\.candidateId\|\|""\),now\)/);
 assert.match(worker,/await this\.applyCycle\(meta,"night",night\+1,"night-"\+\(night\+1\),"auto"\)/);
});
