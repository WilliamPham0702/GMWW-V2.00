import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const core=read('server-game/src/00-core-and-library.part'),
  lib=read('server-game/src/10-library-and-settings.part'),
  battle=read('server-game/src/30-village-and-setup.part');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));

test('runtime routes on ID only; never selects a coincidentally matching name',()=>{
 const src=cut(battle,'function battleFindAudioCandidates(', 'async function battleWarmAudio(');
 const ctx={state:{audio:{system:[
   {id:'bad-one',name:'Hết giờ',targetId:'audio_system_confirm',fileName:'wrong.mp3',verifiedBinary:true},
   {id:'real-up',name:'Hết giờ',targetId:'audio_system_time_up',fileName:'time-up.mp3',verifiedBinary:true},
   {id:'no-id',name:'Hết giờ',fileName:'homonym.mp3',verifiedBinary:true}
 ]}},window:{GMWW_V1_AUDIO:{}},gmwwBundledLegacyAudio:{}};
 vm.createContext(ctx);vm.runInContext(src+';globalThis.find=battleFindAudio',ctx);
 assert.equal(ctx.find('system','audio_system_time_up','Hết giờ').id,'real-up');
 assert.equal(ctx.find('system','audio_system_fake','Hết giờ'),null);
 assert.equal(ctx.find('system','','Hết giờ'),null);
});

test('source choice ignores a stale canonical row when a GM-uploaded duplicate exists',async()=>{
 const src=cut(battle,'function battleFindAudioCandidates(', 'async function battleWarmAudio(');
 const pick=cut(battle,'async function battlePlayConfiguredAudio(', 'function battleTurnAudioCue(');
 const heard=[],ctx={
    state:{cards:[],audio:{system:[
      {id:'audio_system_time_up',targetId:'audio_system_time_up',fileName:'old-file.mp3',verifiedBinary:true},
      {id:'custom-archive',targetId:'audio_system_time_up',fileName:'correct.mp3',verifiedBinary:true}
    ]}},window:{GMWW_V1_AUDIO:{}},gmwwBundledLegacyAudio:{},
    battleAudioReady:new Map(),battleAudioLast:{key:'',at:0},battleAudioRequestId:0,battleActiveAudio:null,
    battleState:{key:'day1'},playAudioMuted:()=>false,
    battleWarmAudio:async(_kind,a)=>a.id==='custom-archive'?'blob:correct':null,
    Audio:class{constructor(s){this.s=s;this.preload='';this.readyState=0;this.duration=1}addEventListener(){}async play(){heard.push(this.s)}pause(){}},
    battlePlayWebAudioFallback:async()=>false,battleSpeakCue:()=>false,
    setTimeout:()=>1,clearTimeout:()=>{},Date
 };
 vm.createContext(ctx);vm.runInContext(src+pick+';globalThis.play=battlePlayConfiguredAudio',ctx);
 assert.equal(await ctx.play('system','audio_system_time_up','Hết giờ'),true);
 assert.deepEqual(heard,['blob:correct']);
});

test('legacy migration keeps alternate uploaded IDs rather than deleting their IndexedDB binding',()=>{
 const src=cut(core,'function applyV210Rules(', 'function applyV226Catalog(');
 assert.match(src,/const usedActionIds=new Set/);
 assert.match(src,/const canonicalIds=new Set/);
 assert.match(src,/systemAudio\.filter\(a=>!canonicalIds\.has/);
 assert.match(src,/cardAudio\.filter\(a=>String\(a.id\)!==String\(keepCard.id\)\)/);
});

test('source audit requires real local or bundled bytes; filename metadata is never proof',async()=>{
 const src=cut(lib,'async function audioBindingStatus(', 'async function gmwwRoleNameAudioStatus(');
 const ctx={
   audioKind:'system',Blob,window:{GMWW_V1_AUDIO:{}},gmwwBundledLegacyAudio:{'ROLE:source-18':{base64:'X'.repeat(150)}},
   audioBlobKey:(kind,id)=>kind+':'+id,
   dbGet:async key=>key==='cards:local'?{blob:new Blob(['abc'])}:null
 };
 vm.createContext(ctx);
 vm.runInContext(src+';globalThis.status=audioBindingStatus',ctx);
 assert.equal(await ctx.status({id:'audio_system_countdown',fileName:'gmww-countdown.m4a',verifiedBinary:true},'system'),'missing');
 assert.equal(await ctx.status({id:'local'},'cards'),'local');
 assert.equal(await ctx.status({id:'old',sourceKey:'ROLE:source-18'},'cards'),'bundled');
 assert.equal(await ctx.status({id:'remote',url:'https://example.invalid/audio.mp3'},'system'),'remote');
});

test('a name-only reveal never plays an excerpt or falls back to the Full audio',()=>{
 const src=cut(battle,'async function battlePlayConfiguredAudio(', 'function battleTurnAudioCue(');
 assert.match(src,/audioKindForSource=nameOnly\?'cards-name':kind/);
 assert.match(src,/await battleWarmAudio\(audioKindForSource,candidate\)/);
 assert.match(src,/const requestedCut=null/);
 assert.doesNotMatch(src,/hasExactCut|roleNameEnd>/);
});

test('GM assembly still matches seven source files byte-for-byte',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
 assert.equal(read('server-game/current/app.js'),parts.map(p=>read('server-game/src/'+p)).join(''));
});

test('fallback is restricted to real system event IDs with exact Vietnamese scripts',()=>{
 const src=cut(battle,'async function battlePlayConfiguredAudio(', 'function battleTurnAudioCue(');
 assert.match(src,/audio_system_day_wakeup:'Làng ơi dậy đi'/);
 assert.match(src,/audio_system_gallows_result_dead:'Người bị treo đã chết'/);
 assert.match(src,/audio_system_assassin_correct:'Sát Thủ đã chọn đúng/);
 assert.match(src,/if\(kind!=='system'\)return ''/);
 assert.match(src,/Object\.prototype\.hasOwnProperty\.call\(systemScripts,targetId\)/);
});

test('all role, Artifact and their action audio slots are maintained during catalog synchronization',()=>{
 const section=cut(core,"  const syncAudio=(kind,target,idPrefix)=>", 'function applyV226Prefs(');
 assert.match(section,/syncAudio\('cards',c,'audio_card_'\)/);
 assert.match(section,/syncAudio\('artifacts',c,'audio_artifact_'\)/);
 assert.match(section,/s\.actions\.artifacts\|\|\[\]/);
 assert.match(lib,/kind==='artifacts'\?\(state\.artifacts\|\|\[\]\)/);
});
test('all declared morning status types have matching canonical Audio IDs and speech fallback',()=>{
 for(const name of ['protected','saved','healed','revived','blessed','shielded','poisoned','wolf_bite','cursed',
  'frozen','silenced','infected','marked','expelled']){
  const target='audio_system_morning_'+name;
  assert.ok(core.includes("id:'"+target+"'"),'Missing system audio slot '+target);
  assert.ok(battle.includes(target+":" )||battle.includes("'"+target+"'"),
    'Missing dedicated speech fallback '+target);
 }
});

test('TTS never reads Vietnamese cues using a known non-Vietnamese voice',()=>{
 const fn=cut(battle,'function battleSpeakCue(', 'let battleUnlockedAudioContext=null;');
 assert.match(fn,/voices\.length&&!vi/);
 assert.match(fn,/\^vi\(\?:-\|\$\)/);
 assert.match(fn,/cue\.lang='vi-VN'/);
});
