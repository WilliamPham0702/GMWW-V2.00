import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {onlineGmActionIcon} from '../src/gmww-online-action-icons.js';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';

const web=playerWebSource('35-online-chat');
const runner=fs.readFileSync('src/gmww-demo-runner.js','utf8');
const worker=workerSource();
const refresh=playerWebSource('30-rooms-and-realtime');
function section(src,from,to){
 const start=src.indexOf(from),end=src.indexOf(to,start);
 assert.ok(start>=0&&end>start,'Missing '+from);
 return src.slice(start,end).trim();
}
test('First-night online Witch is offered both GM Save and Kill icons; DEMO unchanged',()=>{
 const action=id=>({id,actionId:id,name:id,actorIds:['witch'],roleIds:['role_witch'],targetCount:1});
 const deps={rules:{actionsForTurn:()=>[action('action_witch_save'),action('action_witch_kill')]},
  demoDivinationTargetCount:a=>a.targetCount,checkBattleRoleActionUsage:()=>({ok:true}),
  isBattleActorBlocked:()=>false,status:()=>false,STATUS_DEFS:{},Number,String,Date};
 const night=vm.runInNewContext('('+section(runner,'function nightActions(','function dayActions(')+')',deps);
 const meta={matchId:'m',cycleNight:1},ctx={cards:[{id:'role_witch'}],artifacts:[],rows:[],assignments:[],cycle:{accepted:[]},cfg:{}};
 assert.equal(night(ctx,meta,{kind:'role',roleId:'role_witch'},[],true).map(a=>a.actionId).join(','),'action_witch_save,action_witch_kill');
 assert.equal(night(ctx,meta,{kind:'role',roleId:'role_witch'},[],false).map(a=>a.actionId).join(','),'action_witch_save');
 assert.equal(onlineGmActionIcon('action_witch_save'),'/action-icons/v3/07_cuu.webp');
 assert.equal(onlineGmActionIcon('action_witch_kill'),'/action-icons/v3/08_ha_doc.webp');
});
test('Use GM wolf resolution for protected private Witch target, no fabricated bite',()=>{
 const assignments=[{loginId:'alpha',roleId:'role_alpha_wolf'},{loginId:'witch',roleId:'role_witch'}],
 players={'member:target':{loginId:'target',seatId:2},'member:alpha':{loginId:'alpha',seatId:1}};
 const r=resolveWolfNight({matchId:'m1',night:1,players,assignments,interactions:[
  {type:'effect_notice',actionId:'action_wolf_bite',actorId:'alpha',loginId:'target',matchId:'m1',night:1}]});
 assert.equal(r.attacked.map(x=>x.to).join(','),'target');
 assert.match(worker,/witchActor&&!witchSaveUsed\?resolveWolfNight\(\{/);
 assert.match(worker,/privateAssignments\.some\(a=>normalizeLoginId\(a\.loginId\)===loginId&&a\.roleId==="role_witch"\)/);
 assert.match(worker,/witchBite,artifact,artifactExpected:/);
 assert.equal((refresh.match(/gmwwOnlineWitchBite=d\?\.witchBite\|\|null/g)||[]).length,2);
 assert.doesNotMatch(worker,/this\.broadcast\(\{[^\n]*witchBite/);
});
test('Reuse the exact GM turn and target labels, highlights and private target sources',()=>{
 const e=section(web,'function gmwwOnlineTurnEffects(offers){','function renderOnlineActionDock(){');
 for(const token of ["classList.toggle('is-battle-actor',actor)","classList.toggle('is-battle-target',target)",
  "'★ ĐẾN LƯỢT'","'MỤC TIÊU'","background:#7ee08a","background:#ff6b5b",
  "gmwwOnlineWitchBite?.targetIds","gmwwOnlinePick?.targets"])
  assert.ok(e.includes(token),token);
});
test('Fire action dock fits multiple icons with safe touch drag and is not oversized',()=>{
 const d=section(web,'function renderOnlineActionDock(){','function gmwwOnlinePlaceAtFire(dock){');
 assert.match(d,/flex-wrap:wrap;justify-content:center;align-items:center/);
 assert.match(d,/width:clamp\(28px,calc\(48px \* var\(--online-action-scale,1\)\),72px\)/);
 assert.match(d,/for\(const action of offers\)/);
 assert.match(web,/gmwwOnlineWitchNotice\(\);gmwwOnlinePlaceAtFire\(dock\)/);
 // V3.304: home anchor is the entrance stairs above the bottom menu.
 assert.match(web,/getElementById\('gmwwOnlineFooter'\)/);
 // pointercancel still never drops; it only puts the lifted icon back home.
 assert.match(web,/if\(e\.type==='pointercancel'\)\{settle\(\);return\}/);
});
test('Aura reads the GM revelation.message text rather than printing JSON',()=>{
 const r=section(web,'function gmwwOnlineShowRevelation(revelation){','function gmwwOnlineWitchNotice(){');
 assert.match(r,/String\(revelation\?\.message\|\|''\)/);
 assert.match(r,/toast\('Kết quả: '\+message\)/);
 assert.doesNotMatch(r,/JSON\.stringify/);
 assert.match(web,/if\(d\.revelation\?\.message\)gmwwOnlineShowRevelation\(d\.revelation\)/);
 assert.doesNotMatch(web,/if\(d\.revelation\)toast\('Kết quả: '\+JSON\.stringify/);
});
test('Private Witch notice includes confirmed bite names, guard against missing bites',()=>{
 const r=section(web,'function gmwwOnlineWitchNotice(){','function gmwwOnlineIconDown(');
 assert.match(r,/gmwwOnlineWitchBite/);
 assert.match(r,/gmwwOnlinePeople\(\)/);
 assert.match(r,/Người bị Sói cắn/);
 assert.match(r,/Chưa có người bị Sói cắn/);
 assert.match(web,/function gmwwOnlineRestore\(/);
});
