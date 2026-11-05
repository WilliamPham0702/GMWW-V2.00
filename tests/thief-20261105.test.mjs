import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {thiefPool,thiefCanChoose,thiefDeckView,thiefPlan} from '../src/gmww-thief-rules.js';
import {inheritedRolePlans} from '../src/gmww-role-inheritance-rules.js';
import {buildPrivateDeliverySnapshot} from '../src/gmww-delivery-snapshot.js';
import {isBattleActorBlocked} from '../src/gmww-battle-actor-eligibility.js';
import {isWolfRole} from '../src/gmww-pack-night-rules.js';
import {maidSuccession} from '../src/gmww-swap-info-rules.js';
import {apprenticeSuccession} from '../src/gmww-card-rules-quick.js';

const pkg=(roleId,roleName,faction,functions=[])=>({roleId,roleName,faction,roleCard:{name:roleName,faction,factionId:faction,functions,flags:{}}});
test('Bộ bài Kẻ Trộm: chỉ vai trò thật, không trùng, bỏ chính Kẻ Trộm và lá Artifact',()=>{
  const pool=thiefPool([pkg('role_seer','Tiên Tri','village'),pkg('role_wolf','Sói','wolf'),pkg('role_thief','Kẻ Trộm','village'),
    {roleId:'artifact:x',roleName:'A',roleCard:{}},pkg('role_seer','Tiên Tri','village'),{roleId:'role_nocard',roleName:'x'}]);
  assert.deepEqual(pool.map(x=>x.id).sort(),['role_seer','role_wolf']);
  assert.equal(JSON.stringify(thiefDeckView(pool,null,{matchId:'m',night:3})).includes('faction'),false);
});
test('Quy tắc: từ Đêm 3, một lần, chỉ đúng Kẻ Trộm',()=>{
  const as=[{loginId:'t',roleId:'role_thief'},{loginId:'x',roleId:'role_seer'}];
  assert.equal(thiefCanChoose({assignments:as,actorId:'t',night:2}).error,'THIEF_TOO_EARLY');
  assert.equal(thiefCanChoose({assignments:as,actorId:'t',night:3}).ok,true);
  assert.equal(thiefCanChoose({assignments:as,actorId:'t',night:4,existingChoice:{kind:'keep'}}).error,'THIEF_ALREADY_DECIDED');
  assert.equal(thiefCanChoose({assignments:as,actorId:'x',night:3}).error,'THIEF_ROLE_NOT_OWNED');
});
test('Durable Object: đổi sang vai mới nhận phe/chức năng mới, quyết định 1 lần; giữ nguyên cũng khóa lại',async()=>{
  const src=fs.readFileSync('src/index.js','utf8');
  const a=src.indexOf('  async playerThiefChoose(body){'),b=src.indexOf('  async playerDrunkDraw(body){');
  const c=src.indexOf('  async applyNightRoleInheritance('),d=src.indexOf('  async applyNightRoleInheritance(')+src.slice(c).indexOf('\n  }\n')+4;
  const code='class R{'+src.slice(a,b)+src.slice(c,d)+'}';
  const data=new Map(),store={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>{data.set(k,structuredClone(v))},
    list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)]))};
  const runtime={queue:[{id:'t1',kind:'role',roleId:'role_thief',loginIds:['t'],playerIds:['member:t'],durationSec:45}],cursor:0};
  const ctx=vm.createContext({normalizeLoginId:x=>String(x||'').trim().toLowerCase(),j:(o,s=200)=>({body:o,status:s}),thiefPool,thiefCanChoose,thiefDeckView,thiefPlan,
    inheritedRolePlans,buildPrivateDeliverySnapshot,isBattleActorBlocked,isWolfRole,STATUS_DEFS:{},maidSuccession,apprenticeSuccession,publicRoom:m=>m,structuredClone,Date,Number,String,Array,Object,Map,Set,JSON,crypto,console});
  vm.runInContext(code+';this.R=R;',ctx);
  const room=new ctx.R();
  room.ctx={storage:store,blockConcurrencyWhile:f=>f()};
  room.getNightRuntime=async()=>runtime;room.nightRuntimeKey=(m,n)=>'nr:'+n;room.broadcast=()=>{};
  data.set('meta',{phase:'running',cyclePhase:'night',cycleNight:3,matchId:'m',deliveryVersion:1,matchRevision:1});
  data.set('players',{'member:t':{}});
  data.set('assignments',[{assignmentIndex:0,loginId:'t',roleId:'role_thief',roleName:'Kẻ Trộm',faction:'village'}]);
  data.set('roles:t',[{assignmentIndex:0,loginId:'t',roleId:'role_thief',roleName:'Kẻ Trộm',faction:'village',matchId:'m',roleCard:{functions:[]}}]);
  data.set('roleCatalog:role_seer',pkg('role_seer','Tiên Tri','village',[{actionId:'action_seer',phase:'night',fromNight:1}]));
  data.set('interactions',[]);
  assert.equal((await room.playerThiefChoose({loginId:'t',roleId:'role_nope'})).body.error,'THIEF_ROLE_INVALID');
  const ok=await room.playerThiefChoose({loginId:'t',roleId:'role_seer'});
  assert.equal(ok.body.ok,true,JSON.stringify(ok.body));
  assert.equal(data.get('assignments')[0].roleId,'role_seer');
  assert.equal(data.get('thiefChoice:m:t').kind,'change');
  assert.ok(runtime.queue.some(x=>x.id==='role:thief-inherited:t'));
  assert.equal((await room.playerThiefChoose({loginId:'t',roleId:'role_seer'})).body.error,'THIEF_ALREADY_DECIDED');
});

test('Giữ nguyên: ghi nhận một lần, vai trò không đổi',async()=>{
  const src=fs.readFileSync('src/index.js','utf8');
  const a=src.indexOf('  async playerThiefChoose(body){'),b=src.indexOf('  async playerDrunkDraw(body){');
  const ctx=vm.createContext({normalizeLoginId:x=>String(x||'').trim().toLowerCase(),j:(o,s=200)=>({body:o,status:s}),thiefPool,thiefCanChoose,thiefDeckView,thiefPlan,
    isBattleActorBlocked,isWolfRole,STATUS_DEFS:{},Date,Number,String,Array,Object,Map,Set,JSON});
  vm.runInContext('class R{'+src.slice(a,b)+'};this.R=R;',ctx);
  const data=new Map(),room=new ctx.R();
  room.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},list:async()=>new Map()},blockConcurrencyWhile:f=>f()};
  room.getNightRuntime=async()=>({queue:[{kind:'role',roleId:'role_thief',loginIds:['t']}],cursor:0});
  data.set('meta',{phase:'running',cyclePhase:'night',cycleNight:4,matchId:'m'});data.set('players',{'member:t':{}});
  data.set('assignments',[{loginId:'t',roleId:'role_thief'}]);data.set('interactions',[]);
  assert.equal((await room.playerThiefChoose({loginId:'t',keep:true})).body.kept,true);
  assert.equal(data.get('assignments')[0].roleId,'role_thief');
  assert.equal((await room.playerThiefChoose({loginId:'t',keep:true})).body.error,'THIEF_ALREADY_DECIDED');
  data.set('meta',{phase:'running',cyclePhase:'night',cycleNight:2,matchId:'m'});
  assert.equal((await room.playerThiefChoose({loginId:'t',keep:true})).body.error,'THIEF_NOT_ACTIVE');
});
