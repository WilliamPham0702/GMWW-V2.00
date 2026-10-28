import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
const start=source.indexOf('function applyApprovedRoleSettings(s){');
const end=source.indexOf('function applyV221AudioGuard(s){',start);
assert.ok(start>=0&&end>start,'approved migration must be present in canonical GM source');
const defaults=[
 ['role_old_witch','village',['action_exile','action_revive']],
 ['role_snow_wolf','wolf',['action_snow_wolf_freeze','action_wolf_bite']],
 ['role_guard','village',['action_protect']],
 ['role_alpha_wolf','wolf',['action_wolf_bite']],
 ['role_wolf','wolf',['action_wolf_bite']],
 ['role_wolf_seer','wolf',['action_find_seer']],
 ['role_wolf_cub','wolf',['action_wolf_bite']],
 ['role_wolf_hunter','wolf',['action_wolf_bite','action_hunter_mark']],
 ['role_fairy','village',['action_transfer_bite']],
 ['role_witch','village',['action_witch_save','action_witch_kill']],
 ['role_drunk','village',['action_drunk_draw']],
 ['role_clone','village',['action_clone_target']]
].map(([id,factionId,actions])=>({
 id,factionId,functions:actions.map(actionId=>({id:'fn-'+actionId,actionId,usageMode:'unlimited'}))
}));
// Load the canonical fallback declarations along with the tested migration.
const fallbackStart=source.indexOf('const GMWW_AUDITED_ROLE_FALLBACKS=');
assert.ok(fallbackStart>=0&&fallbackStart<start,'canonical catalog declarations exist');
const migrate=vm.runInNewContext(source.slice(fallbackStart,end)+'\napplyApprovedRoleSettings',
  {DEFAULT_STATE:{cards:defaults},clone:v=>JSON.parse(JSON.stringify(v))});
const fixture=()=>{
 const cards=defaults.map(x=>({...JSON.parse(JSON.stringify(x)),information:'LUẬT CŨ',
   limits:'GIỚI HẠN CŨ',conditions:'ĐIỀU KIỆN CŨ',flags:{useNight:true},
   artworkAssetId:'user-custom-art',media:{audio:'user-role.mp3'}}));
 cards.push({id:'role_seer',factionId:'village',information:'Tự chọn mô tả',functions:[]});
 return {cards,audio:{cards:[{targetId:'role_witch',fileName:'witch-user.mp3'}]},
  themes:{custom:'sea'},artifacts:[{id:'artifact-1'}]};
};
const card=(s,id)=>s.cards.find(c=>c.id===id);
const fn=(s,id,action)=>card(s,id).functions.find(x=>x.actionId===action);

test('every approved role displays matching description / limits / conditions in actual Card Settings',()=>{
 const s=fixture();migrate(s);
 for(const def of defaults){
  const c=card(s,def.id);
  assert.notEqual(c.conditions,'ĐIỀU KIỆN CŨ',def.id+' conditions stale');
  if(!['role_wolf','role_wolf_cub','role_wolf_hunter'].includes(def.id)){
   assert.notEqual(c.information,'LUẬT CŨ',def.id+' information stale');
   assert.notEqual(c.limits,'GIỚI HẠN CŨ',def.id+' limits stale');
  }
 }
 assert.match(card(s,'role_old_witch').conditions,/Phù Thuỷ Già|Bầy Sói/);
 assert.match(card(s,'role_snow_wolf').limits,/đêm thứ ba/i);
 assert.match(card(s,'role_guard').information,/Yêu Tinh/);
 assert.match(card(s,'role_alpha_wolf').information,/Đuổi/);
 assert.match(card(s,'role_fairy').information,/Không Dịch/);
 assert.match(card(s,'role_witch').information,/MỤC TIÊU/);
 assert.match(card(s,'role_drunk').conditions,/đêm 3|Đêm 3/);
 assert.match(card(s,'role_clone').conditions,/đêm tiếp/);
 assert.doesNotMatch(card(s,'role_wolf_seer').information,/Không tham gia Sói Cắn/);
 assert.match(card(s,'role_wolf').information,/Cắn chung/);
});
test('actual editable function settings enforce nighttime limits, cooldown, and usage',()=>{
 const s=fixture();migrate(s);
 assert.equal(fn(s,'role_old_witch','action_exile').allowConsecutive,false);
 assert.equal(fn(s,'role_old_witch','action_revive').usageMode,'onceGame');
 assert.equal(fn(s,'role_snow_wolf','action_snow_wolf_freeze').cooldownNights,1);
 assert.equal(fn(s,'role_snow_wolf','action_snow_wolf_freeze').allowConsecutive,false);
 assert.equal(fn(s,'role_guard','action_protect').allowConsecutive,false);
 assert.equal(fn(s,'role_fairy','action_transfer_bite').noTarget,true);
 assert.equal(fn(s,'role_witch','action_witch_save').usageMode,'onceGame');
 assert.equal(fn(s,'role_witch','action_witch_kill').usageMode,'onceGame');
 assert.equal(card(s,'role_witch').flags.allowMultipleActions,true);
 assert.deepEqual([fn(s,'role_drunk','action_drunk_draw').fromNight,
  fn(s,'role_drunk','action_drunk_draw').toNight],[3,3]);
 assert.deepEqual([fn(s,'role_clone','action_clone_target').fromNight,
  fn(s,'role_clone','action_clone_target').toNight],[1,1]);
 assert.equal(fn(s,'role_clone','action_clone_target').noSelf,true);
 for(const x of s.cards.filter(x=>x.factionId==='wolf')){
  assert.equal(x.specialRules.usesPackBite,true,x.id);
  for(const f of x.functions.filter(x=>x.actionId==='action_wolf_bite'))
   assert.equal(f.usesPackBite,true,x.id);
 }
});
test('saved custom artwork/audio, unrelated roles, artifacts and themes survive migration',()=>{
 const s=fixture(),unrelated=JSON.stringify(card(s,'role_seer'));
 const audio=JSON.stringify(s.audio),themes=JSON.stringify(s.themes),owned=JSON.stringify(s.artifacts[0]);
 migrate(s);
 assert.equal(card(s,'role_witch').artworkAssetId,'user-custom-art');
 assert.equal(card(s,'role_witch').media.audio,'user-role.mp3');
 assert.equal(JSON.stringify(card(s,'role_seer')),unrelated);
 assert.equal(JSON.stringify(s.audio),audio);
 assert.equal(JSON.stringify(s.themes),themes);
 assert.equal(JSON.stringify(s.artifacts.find(x=>x.id==='artifact-1')),owned);
 assert.ok(s.artifacts.some(x=>x.id==='artifact_44'),'migration fills missing catalog cards');
});
test('migration is idempotent on repeatedly opening GMWW',()=>{
 const s=fixture();migrate(s);const first=JSON.stringify(s);migrate(s);
 assert.equal(JSON.stringify(s),first);
});
test('lost functions are restored from the approved default without removing custom functions',()=>{
 const s=fixture();
 const witch=card(s,'role_witch');witch.functions=[{id:'custom-action',actionId:'action_custom',description:'retained'}];
 migrate(s);
 assert.ok(witch.functions.some(x=>x.id==='custom-action'));
 assert.equal(fn(s,'role_witch','action_witch_save').usageMode,'onceGame');
 assert.equal(fn(s,'role_witch','action_witch_kill').usageMode,'onceGame');
});
test('existing and legacy saved libraries apply contract AFTER canonical defaults are upserted',()=>{
 assert.match(source,/return applyApprovedRoleSettings\(applyV226Catalog\(/);
 assert.match(source,/const s=applyApprovedRoleSettings\(applyV226Catalog\(/);
 const ui=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
 for(const binding of ['entityInformation','specialLimits','specialConditions','functionList'])
   assert.ok(ui.includes(binding),'Settings editor must display '+binding);
 assert.match(source,/let state=loadState\(\),prefs=loadPrefs\(\);\s*saveState\(\)/);
});

test('existing incomplete Role and Artifact cards recover only missing canonical actions',()=>{
 const s=fixture();
 s.cards.push({id:'role_cupid',name:'Cupid',artworkAssetId:'custom-cupid',functions:[
   {id:'custom',actionId:'action_custom_cupid',description:'GM function retained'}]});
 s.artifacts.push({id:'artifact_24',name:'Sương Hào Quang',artworkAssetId:'custom-aura',
   functions:[{id:'custom',actionId:'action_custom_aura'}]});
 migrate(s);
 const cupid=card(s,'role_cupid'),aura=s.artifacts.find(x=>x.id==='artifact_24');
 assert.equal(cupid.artworkAssetId,'custom-cupid');
 assert.ok(cupid.functions.some(x=>x.actionId==='action-cupid-pair'));
 assert.ok(cupid.functions.some(x=>x.actionId==='action_custom_cupid'));
 assert.ok(aura.functions.some(x=>x.actionId==='artifact_action_check_third_faction'));
 assert.ok(aura.functions.some(x=>x.actionId==='action_custom_aura'));
 const first=JSON.stringify(s);
 migrate(s);assert.equal(JSON.stringify(s),first);
});
