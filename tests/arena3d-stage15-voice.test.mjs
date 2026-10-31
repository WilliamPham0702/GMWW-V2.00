import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLocalArenaVoice,validateArenaSoundFile} from '../assets/village/arena-3d/stage15-local-audio.mjs';
const file=(name='voice.mp3',size=1500,type='audio/mpeg')=>({name,size,type});
test('GĐ15 selected REAL audio file is accepted only with proper type and size',()=>{
 assert.deepEqual(validateArenaSoundFile('action_wolf_bite',file()),{ok:true});
 assert.equal(validateArenaSoundFile('evil<script>',file()).error,'INVALID_ACTION');
 assert.equal(validateArenaSoundFile('action_role',file('hack.js',100,'application/javascript')).error,'INVALID_AUDIO_TYPE');
 assert.equal(validateArenaSoundFile('action_role',file('huge.wav',10000001,'audio/wav')).error,'AUDIO_TOO_LARGE');
 assert.equal(validateArenaSoundFile('action_role',null).error,'INVALID_AUDIO_TYPE');
});
test('GĐ15 upload stays browser-local; GM action deduplicates, revokes resources and pauses on exit',()=>{
 const revoked=[],created=[],played=[],paused=[];
 class Sound{
  constructor(uri){this.uri=uri;this.volume=1;this.preload='';}
  play(){played.push({uri:this.uri,volume:this.volume});return Promise.resolve()}
  pause(){paused.push(this.uri)}
  removeAttribute(){}
  load(){}
 }
 const a=createLocalArenaVoice({
  createURL:blob=>{const url='blob:test-'+(created.length+1);created.push({url,blob});return url},
  revokeURL:url=>revoked.push(url),AudioCtor:Sound
 });
 assert.equal(a.play('action_custom','m1:night:1',{authorizedGM:true,enabled:true}),false);
 assert.equal(a.attach('action_custom',file()).ok,true);
 assert.equal(a.play('action_custom','m1:night:1',{authorizedGM:false,enabled:true}),false);
 assert.equal(a.play('action_custom','m1:night:1',{authorizedGM:true,enabled:false}),false);
 assert.equal(a.play('action_custom','m1:night:1',{authorizedGM:true,enabled:true}),true);
 assert.equal(a.play('action_custom','m1:night:1',{authorizedGM:true,enabled:true}),false);
 assert.equal(played[0].volume,.24);
 assert.equal(a.attach('action_custom',file('fixed.mp3')).ok,true);
 assert.deepEqual(revoked,['blob:test-1']);
 a.clear();
 assert.equal(a.count,0);assert.ok(paused.length>0);
 assert.deepEqual(revoked,['blob:test-1','blob:test-2']);
 assert.equal(a.play('action_custom','m1:night:2',{authorizedGM:true,enabled:true}),false);
});
test('GĐ15 cap number of local files; never write storage, cloud or production',()=>{
 const released=[];
 class Sound{play(){return Promise.resolve()}}
 const a=createLocalArenaVoice({maxFiles:2,createURL:f=>'blob:'+f.name,revokeURL:u=>released.push(u),AudioCtor:Sound});
 assert.equal(a.attach('action_a',file('one.mp3')).ok,true);
 assert.equal(a.attach('action_b',file('two.mp3')).ok,true);
 assert.equal(a.attach('action_c',file('three.mp3')).error,'AUDIO_LIMIT');
 a.clear();assert.equal(released.length,2);
 const js=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const html=readFileSync('assets/village/arena-3d/live.html','utf8');
 assert.match(js,/URL\.createObjectURL\(file\)/);
 assert.match(js,/localVoice\.clear\(\)/);
 assert.match(js,/localVoice\.play\(cast\.actionId/);
 assert.match(html,/id="arena-audio-file"/);
 const module=readFileSync('assets/village/arena-3d/stage15-local-audio.mjs','utf8');
 assert.doesNotMatch(module,/localStorage|indexedDB|fetch\(|XMLHttpRequest|FormData/);
});
