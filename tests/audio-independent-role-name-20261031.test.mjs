import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const library=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const battle=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('Role Audio library has independent Play Tên / Play Full / Thay thế, no cutting editor',()=>{
  for(const source of [library,app]){
    assert.match(source,/data-audio-name-play/);
    assert.match(source,/Play Full/);
    assert.match(source,/gmwwOpenRoleAudioReplace/);
    assert.match(source,/data-audio-upload-name/);
    assert.match(source,/data-audio-link-name/);
    assert.match(source,/data-audio-upload-full/);
    assert.match(source,/data-audio-link-full/);
    assert.match(source,/audioBlobKey\('cards-name',a\.id\)/);
    assert.doesNotMatch(source,/gmwwOpenAudioNameEditor|gmwwAudioHasNameCut|data-audio-name="/);
  }
});

test('Aura role name uses only independent file, never legacy clip time offsets',()=>{
  for(const source of [battle,app]){
    assert.match(source,/audioKindForSource=nameOnly\?'cards-name':kind/);
    assert.match(source,/await battleWarmAudio\(audioKindForSource,candidate\)/);
    assert.match(source,/const requestedCut=null/);
    assert.doesNotMatch(source,/candidates\.sort\(\(a,b\)=>\s*Number\(Number\(b\.roleNameEnd\)/);
  }
  assert.match(fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8'),
    /battlePlayConfiguredAudio\('cards',target\.roleId\|\|'',roleName,false,null,1\)/);
});

test('Role-name playback honors separately linked source; full clip remains intact',async()=>{
  const from=app.indexOf('const battleAudioReady=');
  const to=app.indexOf('function applyPlayAudioState()',from);
  assert.ok(from>0&&to>from);
  const played=[],warnings=[];
  const voice={id:'witch-voice',targetId:'role_old_witch',name:'Phù Thủy Già',
    url:'https://example.test/full.mp3',nameUrl:'https://example.test/name.mp3',
    roleNameStart:0,roleNameEnd:0.3};
  class FakeAudio{
    constructor(src){this.src=src;this.muted=false;this.readyState=0;this.duration=2;this.listeners={}}
    addEventListener(type,handler){this.listeners[type]=handler}
    async play(){played.push(this.src);this.listeners.playing?.();return true}
    pause(){}
  }
  const ctx={state:{audio:{cards:[voice]},cards:[{id:'role_old_witch',name:'Phù Thủy Già'}]},
    Blob,URL,Map,Date,Number,String,Math,Array,
    Audio:FakeAudio,playAudioMuted:()=>false,
    dbGet:async()=>null,bundledAudioBlob:()=>null,
    audioBlobKey:(kind,id)=>'audio|'+kind+'|'+id,
    battleState:{key:'test-night'},playFlashError:x=>warnings.push(x),
    setTimeout,clearTimeout};
  vm.runInNewContext(app.slice(from,to)+'\nglobalThis.playClip=battlePlayConfiguredAudio;globalThis.invalidate=battleInvalidateAudioCache;',ctx);
  assert.equal(await ctx.playClip('cards','role_old_witch','Phù Thủy Già',false,null,1),true);
  assert.equal(played.at(-1),'https://example.test/name.mp3');
  assert.equal(await ctx.playClip('cards','role_old_witch','Phù Thủy Già',false),true);
  assert.equal(played.at(-1),'https://example.test/full.mp3');
  // The old cut fields exist, but without an independent Tên source there
  // must be no attempt to play the Full URL in name-only mode.
  voice.nameUrl='';ctx.invalidate('cards-name',voice.id);
  const before=played.length;
  assert.equal(await ctx.playClip('cards','role_old_witch','Phù Thủy Già',true,null,1),false);
  assert.equal(played.length,before);
  assert.match(warnings.at(-1),/Chưa có file Audio/);
});
