import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArenaAudioEngine,ARENA_SOUND_FAMILIES,arenaSoundNotes,STAGE12_VERSION} from '../assets/village/arena-3d/stage12-audio-engine.mjs';
import {resolveRoleAnimation} from '../assets/village/arena-3d/stage10-role-animations.mjs';
function fakeContext(){
 const voices=[],volumes=[];
 class Context{
  constructor(){this.state='running';this.currentTime=3;this.destination={};}
  createOscillator(){const item={frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}};voices.push(item);return item}
  createGain(){const item={gain:{setValueAtTime(n){volumes.push(n)},linearRampToValueAtTime(n){volumes.push(n)},exponentialRampToValueAtTime(n){volumes.push(n)}},connect(){}};return item}
  close(){return Promise.resolve()}resume(){return Promise.resolve()}
 }
 return {Context,voices,volumes};
}
test('GĐ12 silent by default, requires user gesture and deduplicates Core WS/poll repeats',()=>{
 const {Context,voices,volumes}=fakeContext(),audio=createArenaAudioEngine(Context);
 const wolf=resolveRoleAnimation({kind:'attack',actionId:'action_wolf_bite'});
 assert.equal(audio.play(wolf,'match-1-night-1-wolf'),false);
 assert.equal(voices.length,0);
 assert.equal(audio.enableFromGesture(),true);
 assert.equal(audio.play(wolf,'match-1-night-1-wolf'),true);
 assert.equal(audio.play(wolf,'match-1-night-1-wolf'),false);
 assert.equal(audio.playedCount,1);
 assert.ok(voices.length<=3);
 assert.ok(volumes.every(x=>x<=.035));
 audio.stop();
 assert.equal(audio.enabled,false);
 assert.equal(audio.play(wolf,'match-1-night-2-wolf'),false);
});
test('GĐ12 sound profiles are distinct; no fake MP3 or role speech URLs',()=>{
 assert.equal(STAGE12_VERSION,'gmww.arena.opt-in-sound.12');
 assert.equal(ARENA_SOUND_FAMILIES.length,9);
 assert.notDeepEqual(arenaSoundNotes('wolf'),arenaSoundNotes('oracle'));
 assert.notDeepEqual(arenaSoundNotes('heal'),arenaSoundNotes('shield'));
 const src=readFileSync('assets/village/arena-3d/stage12-audio-engine.mjs','utf8');
 assert.doesNotMatch(src,/fetch\(|new Audio\(|\.mp3|\.wav/);
 assert.equal(createArenaAudioEngine(null).enableFromGesture(),false);
});
test('GĐ12 GM token gate, synthetic-only audio preview and direct user toggle',()=>{
 const src=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const html=readFileSync('assets/village/arena-3d/live.html','utf8');
 assert.match(src,/if\(!cue\?\.cast\|\|\(!syntheticPreview&&!gmToken\)\|\|!arenaAudio\.enabled\)return false/);
 assert.match(src,/playArenaCastSound\(normalized\)/);
 assert.match(src,/playArenaCastSound\(cue,\{syntheticPreview:true\}\)/);
 assert.match(src,/\$\('arena-audio'\)\.onclick=/);
 assert.match(src,/window\.addEventListener\('pagehide',\(\)=>\{arenaAudio\.stop\(\);localVoice\.clear\(\)\}\)/);
 assert.ok(html.includes('id="arena-audio"'));
 assert.doesNotMatch(src,/dataset\.gmwwStage10(?:Motion|Projectile|SoundId)/);
});
