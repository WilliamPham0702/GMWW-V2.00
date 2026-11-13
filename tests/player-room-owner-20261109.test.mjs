import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandDeck,planPlayerRoomDeal,playerRoomConfigFromTemplate,missingRoleCards,ownerDeckView} from '../src/gmww-player-room-setup.js';
import {normalizeLoginId} from '../src/gmww-player-identity-rules.js';
import {PLAYER_ROOM_ROLE_CATALOG} from '../src/player-room-role-catalog.js';

const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const j=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const roles=[{roleId:'wolf',roleName:'Sói',faction:'wolf',count:2,order:2},{roleId:'seer',roleName:'Tiên Tri',faction:'village',count:1,order:1},{roleId:'villager',roleName:'Dân Làng',faction:'village',count:3}];
const names=['a','b','c','d','e','f'];

// ---- pure set-up helpers ----
test('deck expands by count and ignores entries without a role id',()=>{
  const deck=expandDeck([...roles,{roleName:'no id'},{roleId:'x',count:999}]);
  assert.equal(deck.filter(c=>c.roleId==='wolf').length,2);
  assert.equal(deck.filter(c=>c.roleId==='x').length,20,'count capped at 20');
  assert.equal(expandDeck(null).length,0);
});
test('deal gives every player exactly one card from the deck, never more or fewer',()=>{
  const members=names.map(loginId=>({loginId})),plan=planPlayerRoomDeal(roles,members,d=>[...d].reverse());
  assert.equal(plan.ok,true);assert.equal(plan.rows.length,6);
  assert.deepEqual(plan.rows.map(r=>r.loginId),names);
  assert.deepEqual(plan.rows.map(r=>r.roleId).sort(),['seer','villager','villager','villager','wolf','wolf']);
});
test('deal refuses a template whose size differs from the seated players',()=>{
  const few=planPlayerRoomDeal(roles,names.slice(0,5).map(loginId=>({loginId})),d=>d);
  assert.deepEqual([few.ok,few.error,few.need,few.have],[false,'ROLE_COUNT_MISMATCH',6,5]);
  assert.equal(planPlayerRoomDeal(roles,[],d=>d).error,'NO_PLAYERS');
  assert.equal(planPlayerRoomDeal(roles,names.map(loginId=>({loginId})),()=>[]).error,'SHUFFLE_FAILED');
});
test('template config for a player room preserves the full Artifact and timing setup',()=>{
  const cfg=playerRoomConfigFromTemplate({id:'t1',compiledConfig:{name:'Mẫu',playerCount:6,roles,artifactsEnabled:true,artifacts:[{artifactId:'a'}]}});
  assert.equal(cfg.artifactsEnabled,true);assert.deepEqual(cfg.artifacts,[{artifactId:'a'}]);assert.equal(cfg.roles.length,3);assert.equal(cfg.id,'t1');
  assert.equal(playerRoomConfigFromTemplate({compiledConfig:{roles:[]}}),null);assert.equal(playerRoomConfigFromTemplate(null),null);
});
test('selected Artifacts are distributed randomly and remain private in the plan',()=>{
  const pool=[{artifactId:'a',name:'Cổ vật A',artifactCard:{name:'Cổ vật A'}},{artifactId:'b',name:'Cổ vật B',artifactCard:{name:'Cổ vật B'}}];
  const plan=planPlayerRoomDeal(roles,names.map(loginId=>({loginId})),items=>[...items].reverse(),pool);
  assert.equal(plan.ok,true);assert.equal(plan.rows.filter(x=>x.artifact).length,2);
  assert.deepEqual(plan.rows.filter(x=>x.artifact).map(x=>x.artifact.artifactId),['a','b']);
  assert.ok(plan.rows.every(x=>x.loginId&&x.roleId));
});
test('missing role cards are reported once per role and the owner deck view has no assignments',()=>{
  assert.deepEqual(missingRoleCards(roles,id=>id==='wolf'),['seer','villager']);
  const view=ownerDeckView({id:'t',name:'N',playerCount:6,roles,assignments:[{loginId:'a',roleId:'wolf'}],gmTokenHash:'x'});
  assert.deepEqual(Object.keys(view).sort(),['artifactLimitPerCycle','artifacts','artifactsEnabled','id','name','playerCount','roles','timing']);
  assert.deepEqual(Object.keys(view.roles[0]).sort(),['count','faction','roleId','roleName']);
});

// ---- real Durable Object owner methods ----
const from=source.indexOf('  // ---- Player-room owner API'),to=source.indexOf('  async memberLogout(request){',from);
assert.ok(from>0&&to>from,'find real owner methods');
const GM='GM-TOKEN-FOR-TEST';
const bearer=r=>{const m=/^Bearer\s+(.+)$/i.exec(r.headers.get('authorization')||'');return m?m[1]:''};
const sha256=async v=>'h:'+v,timingSafeEqual=(a,b)=>a===b;
const Owner=new Function('GM_SYNC_TOKEN','j','bearer','sha256','timingSafeEqual','safeJson','normalizeLoginId','publicRoom','publicPlayer','ownerDeckView','playerRoomConfigFromTemplate','missingRoleCards','planPlayerRoomDeal','secureShuffle','crypto','MEMBER_STORE_NAME',
  'return class Owner {\n'+source.slice(from,to)+'\n}')(GM,j,bearer,sha256,timingSafeEqual,async r=>r.json().catch(()=>null),normalizeLoginId,m=>({code:m.code,phase:m.phase}),p=>({loginId:p.loginId,seatId:p.seatId}),ownerDeckView,playerRoomConfigFromTemplate,missingRoleCards,planPlayerRoomDeal,d=>[...d].reverse(),globalThis.crypto,'member-store');

function room({meta={},players,cfg,cards=['wolf','seer','villager']}={}){
  const data=new Map();
  data.set('meta',{code:'ABCDEF',phase:'lobby',playerRoom:true,ownerLoginId:'nam01',ownerTokenHash:'h:OWNER',seatsLocked:true,...meta});
  data.set('players',players||Object.fromEntries(names.map((n,i)=>['member:'+n,{kind:'member',loginId:n,seatId:i+1}])));
  if(cfg!==null)data.set('gameConfig',cfg||{id:'t',name:'Mẫu',playerCount:6,roles});
  for(const c of cards)data.set('roleCatalog:'+c,{roleId:c});
  const o=new Owner(),calls=[];o.calls=calls;o.data=data;
  o.ctx={storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>{data.set(k,structuredClone(v))},delete:async k=>{data.delete(k)},list:async({prefix=''}={})=>new Map([...data].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)]))}};
  const rec=(name,res={ok:true})=>async(req,body)=>{calls.push({name,auth:req?.headers?.get?.('authorization')||null,body});return j(res)};
  for(const n of ['gmSeatLock','gmRandomizeRemainingSeats','gmKick','gmRoomSettings','gmConfig','gmRoleAssets','gmStart'])o[n]=rec(n);
  o.gmAssign=async(req,body)=>{calls.push({name:'gmAssign',auth:req.headers.get('authorization'),body});data.get('meta').matchId=body.matchId;return j({ok:true,assignments:body.assignments})};
  o.applyCycle=async(meta,phase,night,key,src)=>{calls.push({name:'applyCycle',phase,night,key,src});return{ok:true}};
  return o;
}
const req=(path,{token='OWNER',method='POST',body}={})=>new Request('https://room.internal'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});

test('only the owner token passes the gate; GM token, other tokens and GM rooms are refused',async()=>{
  const o=room();
  for(const token of ['WRONG',GM,''])assert.equal((await o.ownerAction('seat-lock',req('/owner/seat-lock',{token,body:{}}))).status,401);
  assert.equal((await o.ownerAction('seat-lock',req('/owner/seat-lock',{body:{}}))).status,200);
  const gmRoom=room({meta:{playerRoom:false}});
  assert.equal((await gmRoom.ownerAction('seat-lock',req('/owner/seat-lock',{body:{}}))).status,401,'GM-created room has no owner API');
  const noHash=room({meta:{ownerTokenHash:''}});assert.equal((await noHash.ownerAction('seat-lock',req('/owner/seat-lock',{token:'',body:{}}))).status,401);
});
test('owner actions reach the real GM handlers with the internal token, never the owner token',async()=>{
  const o=room();
  await o.ownerAction('seat-lock',req('/owner/seat-lock',{body:{locked:false}}));
  await o.ownerAction('seats-randomize',req('/owner/seats-randomize',{body:{}}));
  assert.deepEqual(o.calls.map(c=>c.name),['gmSeatLock','gmRandomizeRemainingSeats']);
  assert.ok(o.calls.every(c=>c.auth==='Bearer '+GM));assert.deepEqual(o.calls[0].body,{locked:false});
});
test('room settings can never change mode or enable demo, and only whitelisted keys pass',async()=>{
  const o=room();
  await o.ownerAction('room-settings',req('/owner/room-settings',{body:{roomMode:'offline',demo:true,seatCount:20,roomName:'X',gmToken:'evil',seatMoveMode:'walk'}}));
  assert.deepEqual(o.calls[0].body,{roomMode:'online',demo:false,roomName:'X',seatCount:20,seatMoveMode:'walk'});
});
test('owner cannot kick themselves; others are kicked by login',async()=>{
  const o=room();
  const self=await o.ownerAction('kick',req('/owner/kick',{body:{loginId:'Nam01'}}));assert.equal(self.status,400);assert.equal((await self.json()).error,'CANNOT_KICK_OWNER');
  assert.equal((await o.ownerAction('kick',req('/owner/kick',{body:{}}))).status,400);
  await o.ownerAction('kick',req('/owner/kick',{body:{loginId:'B'}}));assert.deepEqual(o.calls.at(-1).body,{loginId:'b'});
});
test('owner state shows the deck only: no assignments, roles of players, tokens or hashes',async()=>{
  const o=room();o.data.set('assignments',[{loginId:'a',roleId:'wolf'}]);o.data.get('meta').gmTokenHash='SECRET';
  const res=await o.ownerAction('state',req('/owner/state',{method:'GET'})),text=await res.text(),body=JSON.parse(text);
  assert.equal(res.status,200);assert.equal(body.config.roles.length,3);assert.equal(body.players.length,6);
  for(const bad of ['assignments','gmTokenHash','ownerTokenHash','SECRET','h:OWNER','roleId":"wolf","loginId'])assert.equal(text.includes(bad),false,bad);
  assert.equal((await o.ownerAction('state',req('/owner/state',{token:'WRONG',method:'GET'}))).status,401);
});
test('apply-template loads config and role cards, preserves artifacts, and only in the lobby',async()=>{
  const o=room({cfg:null,cards:[]}),template={id:'t1',compiledConfig:{name:'Mẫu',playerCount:6,roles,artifactsEnabled:true,artifacts:[{artifactId:'a'}]}};
  const res=await o.ownerAction('apply-template',req('/owner/apply-template',{body:{template,packages:[{roleId:'wolf',roleCard:{}},{roleId:'not-in-template'}]}}));
  assert.equal(res.status,200);
  assert.deepEqual(o.calls.map(c=>c.name),['gmConfig','gmRoleAssets']);
  assert.equal(o.calls[0].body.gameConfig.artifactsEnabled,true);assert.deepEqual(o.calls[0].body.gameConfig.artifacts,[{artifactId:'a'}]);assert.deepEqual(o.calls[1].body.roles.map(r=>r.roleId),['wolf'],'packages outside the template are dropped');
  const running=room({meta:{phase:'running'}});assert.equal((await running.ownerAction('apply-template',req('/owner/apply-template',{body:{template}}))).status,409);
  assert.equal((await room().ownerAction('apply-template',req('/owner/apply-template',{body:{template:{}}}))).status,400);
});
test('start deals every player one role, starts the match and night 1, and returns no assignments',async()=>{
  const o=room(),res=await o.ownerAction('start',req('/owner/start',{body:{}})),text=await res.text(),body=JSON.parse(text);
  assert.equal(res.status,200);assert.equal(body.started,true);
  assert.deepEqual(o.calls.map(c=>c.name),['gmAssign','gmStart','applyCycle']);
  const assign=o.calls[0].body;assert.equal(assign.assignments.length,6);assert.match(assign.matchId,/^p[0-9a-z]+$/);
  assert.deepEqual(assign.assignments.map(r=>r.loginId),names,'deal follows seat order');
  assert.equal(o.calls[1].body.matchId,assign.matchId);
  assert.deepEqual([o.calls[2].phase,o.calls[2].night,o.calls[2].key,o.calls[2].src],['night',1,'night-1','auto']);
  assert.equal(text.includes('roleId'),false,'response carries no role information');
});
test('start refuses unsafe states and changes nothing',async()=>{
  const cases=[
    [room({meta:{seatsLocked:false}}),'SEATS_NOT_LOCKED'],
    [room({meta:{phase:'running'}}),'ROOM_NOT_IN_LOBBY'],
    [room({cfg:null}),'TEMPLATE_NOT_SELECTED'],
    [room({cards:['wolf']}),'TEMPLATE_ASSETS_MISSING'],
    [room({players:Object.fromEntries(names.slice(0,5).map((n,i)=>['member:'+n,{kind:'member',loginId:n,seatId:i+1}]))}),'ROLE_COUNT_MISMATCH'],
  ];
  for(const [o,error] of cases){const res=await o.ownerAction('start',req('/owner/start',{body:{}}));assert.equal(res.status,409);assert.equal((await res.json()).error,error);assert.equal(o.calls.length,0,error+': no GM handler ran')}
});
test('a failing deal or start is returned as is and does not start night 1',async()=>{
  const o=room();o.gmAssign=async()=>j({ok:false,error:'PLAYER_NOT_IN_ROOM'},400);
  assert.equal((await o.ownerAction('start',req('/owner/start',{body:{}}))).status,400);assert.equal(o.calls.some(c=>c.name==='applyCycle'),false);
  const p=room();p.gmStart=async()=>j({ok:false,error:'SEATING_INCOMPLETE'},409);
  assert.equal((await p.ownerAction('start',req('/owner/start',{body:{}}))).status,409);assert.equal(p.calls.some(c=>c.name==='applyCycle'),false);
});

// ---- Worker owner API (real source) ----
const fFrom=source.indexOf('async function playerRoomTemplates(env,request){'),fTo=source.indexOf('async function joinRoom(env,raw,request){',fFrom);
assert.ok(fFrom>0&&fTo>fFrom,'find real Worker owner API');
function worker({gate=200,roomOwner='nam01',artifacts=[],preloadStatus=200}={}){
  const log={room:[],member:[]};
  const memberFetch=async(input,init)=>{const u=typeof input==='string'?input:input.url;log.member.push(u);
    if(u.endsWith('/members/session'))return j({ok:true,member:{loginId:'nam01'}});
    if(u.endsWith('/artifacts/shared/status'))return j({ok:true,artifacts});
    if(u.endsWith('/game-templates/player-save')){log.saved=JSON.parse(init.body);return j({ok:true});}
    if(u.endsWith('/game-templates/list'))return j({ok:true,templates:[{id:'t1',source:'PLAYER'}]});
    if(u.includes('/game-templates/get'))return u.includes('id=missing')?j({ok:false},404):j({ok:true,template:{id:'t1',source:'PLAYER',ownerLoginId:'nam01',compiledConfig:{roles:[{roleId:'wolf'},{roleId:'seer'},{roleId:'wolf'}]}}});
    if(u.includes('/game-templates/delete'))return j({ok:true,deleted:true});
    if(u.includes('/game-templates/assets'))return u.includes('role%3Aseer')?j({ok:false},404):j({ok:true,package:{roleCard:{name:'W'}}});
    throw new Error('unexpected '+u)};
  const roomFetch=async(u,init={})=>{log.room.push({u,method:init.method||'GET',auth:init.headers?.authorization,body:init.body});return u.endsWith('/owner/state')?j({ok:gate===200,ownerLoginId:roomOwner},gate):j({ok:true})};
  const fn=new Function('memberStore','roomStub','j','safeJson','normalizeRoomCode','isValidRoomCode','normalizeLoginId','PLAYER_ROOM_ROLE_CATALOG','GM_SYNC_TOKEN','gmPreloadSharedArtifacts',source.slice(fFrom,fTo)+'\nreturn {playerRoomOwnerApi,playerRoomTemplates,playerRoomRoleList};')(()=>({fetch:memberFetch}),()=>({fetch:roomFetch}),j,async r=>r.json().catch(()=>null),v=>String(v||'').trim().toUpperCase(),c=>/^[A-HJ-NP-Z2-9]{6}$/.test(c),normalizeLoginId,PLAYER_ROOM_ROLE_CATALOG,'internal-test',async(env,code,request)=>{log.preload=await request.json();return j({ok:preloadStatus===200},preloadStatus)});
  return {...fn,log};
}
const wreq=(method,body)=>new Request('https://x/api',{method,headers:{authorization:'Bearer OWNER','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});

test('Worker exposes only the owner actions; apply-template and GM actions are not reachable',async()=>{
  const w=worker();
  for(const a of ['apply-template','assign','config','reset','role-assets','demo'])assert.equal((await w.playerRoomOwnerApi({},'ABCDEF',a,wreq('POST',{}))).status,404,a);
  assert.equal((await w.playerRoomOwnerApi({},'bad','start',wreq('POST',{}))).status,400);
  assert.equal((await w.playerRoomOwnerApi({},'ABCDEF','state',wreq('POST',{}))).status,405);
  assert.equal((await w.playerRoomOwnerApi({},'ABCDEF','start',wreq('GET'))).status,405);
  assert.equal(w.log.room.length,0);
});
test('Worker forwards the owner token untouched and uses the matching DO route',async()=>{
  const w=worker();
  await w.playerRoomOwnerApi({},'ABCDEF','seat-lock',wreq('POST',{locked:true}));await w.playerRoomOwnerApi({},'abcdef','state',wreq('GET'));
  assert.deepEqual(w.log.room.map(r=>[r.u,r.auth]),[['https://room.internal/owner/seat-lock','Bearer OWNER'],['https://room.internal/owner/state','Bearer OWNER']]);
});
test('template selection verifies the owner first, then sends the template and its role cards to the room',async()=>{
  const denied=worker({gate:401}),res=await denied.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'t1'}));
  assert.equal(res.status,401);assert.equal(denied.log.member.length,0,'no template data read for a non-owner');
  const w=worker(),ok=await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'t1'}));
  assert.equal(ok.status,200);
  const sent=JSON.parse(w.log.room.at(-1).body);assert.equal(w.log.room.at(-1).u,'https://room.internal/owner/apply-template');
  assert.deepEqual(sent.packages.map(p=>p.roleId),['wolf'],'duplicate roles fetched once; roles without an asset are skipped');
  assert.equal((await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'missing'}))).status,404);
  assert.equal((await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{}))).status,400);
});
test('template list needs a member session',async()=>{
  const w=worker(),res=await w.playerRoomTemplates({},new Request('https://x',{headers:{authorization:'Bearer t'}}));
  assert.equal(res.status,200);const d=await res.json();assert.equal(d.templates[0].id,'t1');assert.equal(d.templates[0].canEdit,true);
});
test('only the creator can delete a player-made Ván Mẫu',async()=>{
  const other=worker({roomOwner:'another'}),denied=await other.playerRoomOwnerApi({},'ABCDEF','template-delete',wreq('POST',{templateId:'t1'}));
  assert.equal(denied.status,403);
  const owner=worker(),ok=await owner.playerRoomOwnerApi({},'ABCDEF','template-delete',wreq('POST',{templateId:'t1'}));
  assert.equal(ok.status,200);assert.ok(owner.log.member.some(u=>u.includes('/game-templates/delete')));
});

// ---- wiring guards ----
test('routes: owner API is under /api/player-rooms and the DO route list matches the Worker whitelist',()=>{
  assert.ok(source.includes('const ownerApi=url.pathname.match(/^\\/api\\/player-rooms\\/([A-Za-z0-9]+)\\/owner\\/([a-z-]+)$/);if(ownerApi)return playerRoomOwnerApi('));
  assert.ok(source.includes('/^\\/owner\\/(state|seat-lock|seats-randomize|kick|room-settings|apply-template|roles-shuffle|start|end|stage|close)$/'));
  assert.ok(source.includes('if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);'),'GM room creation unchanged');
});

test('roles-shuffle keeps the secret plan server-side, counts rounds, and start reuses the last plan',async()=>{
  const o=room(),a=await o.ownerAction('roles-shuffle',req('/owner/roles-shuffle',{body:{}})),ta=await a.text();
  assert.equal(a.status,200);assert.equal(JSON.parse(ta).dealRound,1);assert.equal(ta.includes('roleId'),false,'shuffle response carries no role information');
  const b=await o.ownerAction('roles-shuffle',req('/owner/roles-shuffle',{body:{}}));assert.equal(JSON.parse(await b.text()).dealRound,2);
  const plan=(await o.ctx.storage.get('pendingDeal')).rows.map(r=>r.loginId+':'+r.roleId);
  const s=await o.ownerAction('start',req('/owner/start',{body:{}}));assert.equal(s.status,200);
  assert.deepEqual(o.calls[0].body.assignments.map(r=>r.loginId+':'+r.roleId),plan,'start deals the last shuffled plan');
  assert.equal(await o.ctx.storage.get('pendingDeal'),undefined);
});

test('custom deck: owner picks roles + counts; Worker builds the template from published cards and applies it',async()=>{
  const w=worker(),res=await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{custom:{name:'Ván của Hà',roles:[{roleId:'wolf',count:2},{roleId:'seer',count:1}]}}));
  assert.equal(res.status,200);
  const last=w.log.room.at(-1),sent=JSON.parse(last.body);assert.equal(last.u,'https://room.internal/owner/apply-template');
  assert.equal(sent.template.name,'Ván của Hà');assert.equal(sent.template.playerCount,3);
  assert.deepEqual(sent.template.compiledConfig.roles.map(r=>[r.roleId,r.count]),[['wolf',2],['seer',1]]);
  assert.match(sent.template.id,/^custom-/);assert.deepEqual(sent.packages.map(p=>p.roleId),['wolf'],'roles without a card asset are skipped (room refuses start later)');
  for(const bad of [{roles:[]},{roles:[{roleId:'wolf',count:31},{roleId:'seer',count:1}]},{roles:[{roleId:'ghost',count:1}]}])
    assert.equal((await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{custom:bad}))).status,400,JSON.stringify(bad));
});
test('role list needs a member session and includes the Server library plus published custom roles',async()=>{
  const w=worker(),res=await w.playerRoomRoleList({},new Request('https://x',{headers:{authorization:'Bearer t'}})),d=await res.json();
  assert.equal(res.status,200);assert.ok(d.roles.some(r=>r.roleId==='role_wolf'));assert.ok(d.roles.some(r=>r.roleId==='role_seer'));
  assert.ok(d.roles.some(r=>r.roleId==='wolf'));assert.ok(d.roles.some(r=>r.roleId==='seer'));
});

test('owner close: deletes the room, tells the sockets, frees the directory slot; blocked while running; refused for others',async()=>{
  const closed=[],dir=[],ws={close:(c,r)=>closed.push([c,r])};
  const mk=opts=>{const o=room(opts);o.chatVoiceClear=async()=>{};o.ctx.getWebSockets=()=>[ws];
    o.env={ROOMS:{idFromName:n=>n,get:()=>({fetch:async(u,i)=>{dir.push([u,JSON.parse(i.body)]);return j({ok:true})}})}};return o};
  const bad=mk();assert.equal((await bad.ownerAction('close',req('/owner/close',{token:'WRONG',body:{}}))).status,401);
  const running=mk({meta:{phase:'running'}}),rr=await running.ownerAction('close',req('/owner/close',{body:{}}));
  assert.equal(rr.status,409);assert.equal((await rr.json()).error,'ROOM_RUNNING');assert.equal(running.data.get('meta').phase,'running');
  const o=mk(),res=await o.ownerAction('close',req('/owner/close',{body:{}}));
  assert.equal(res.status,200);assert.equal((await res.json()).closed,true);
  const meta=o.data.get('meta');assert.equal(meta.phase,'deleted');assert.equal(meta.status,'deleted');assert.deepEqual(o.data.get('players'),{});
  assert.deepEqual(closed,[[1000,'ROOM_CLOSED']]);
  assert.deepEqual(dir,[['https://member.internal/directory/rooms/delete',{code:'ABCDEF'}]]);
  assert.equal((await o.ownerAction('state',req('/owner/state',{method:'GET'}))).status,404,'a closed room is gone for its owner');
});

// Shared pool is resolved server-side, not accepted from a client's card selection.
test('Artifact toggle saves without selected cards and keeps timing independent',async()=>{
 const w=worker();
 const r=await w.playerRoomOwnerApi({},'ABCDEF','template-save',wreq('POST',{roles:[{roleId:'wolf',count:3}],artifactsEnabled:true,timing:{defaultActionSec:45}}));
 assert.equal(r.status,200);assert.equal(w.log.saved.compiledConfig.artifactsEnabled,true);assert.deepEqual(w.log.saved.compiledConfig.artifacts,[]);assert.equal(w.log.saved.compiledConfig.timing.defaultActionSec,45);
});
test('Artifact ON resolves every shared card and preloads before applying; OFF skips pool',async()=>{
 const artifacts=['a','b'].map(id=>({assetId:'artifact:'+id,package:{roleCard:{name:id}}}));
 const w=worker({artifacts});const r=await w.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'t1',matchOverrides:{artifactsEnabled:true}}));
 assert.equal(r.status,200);assert.deepEqual(w.log.preload.assetIds,['artifact:a','artifact:b']);assert.deepEqual(JSON.parse(w.log.room.at(-1).body).template.compiledConfig.artifacts.map(a=>a.artifactId),['a','b']);
 const off=worker({artifacts});await off.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'t1',matchOverrides:{artifactsEnabled:false}}));assert.equal(off.log.preload,undefined);assert.equal(off.log.member.some(u=>u.endsWith('/artifacts/shared/status')),false);
 for(const setup of [{artifacts:[]},{artifacts,preloadStatus:409},{artifacts,gate:401}]){const bad=worker(setup);const res=await bad.playerRoomOwnerApi({},'ABCDEF','template',wreq('POST',{templateId:'t1',matchOverrides:{artifactsEnabled:true}}));assert.ok(res.status>=400);assert.equal(bad.log.room.some(r=>r.u.endsWith('/apply-template')),false);}
});
