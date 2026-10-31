#!/usr/bin/env node
/** Real HTTP/login/room/WS/reconnect smoke test against isolated LOCAL workerd ONLY. */
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixtureStore,snapshotFixture} from '../../oracle-staging/room-adapter.mjs';
export function localUrl(env=process.env){
  if(env.GMWW_ORACLE_STAGING!=='1'||env.GMWW_ORACLE_PROBE_ONLY!=='1')
    throw Error('LOCAL_ORACLE_PROBE_OPT_IN_REQUIRED');
  if(env.CLOUDFLARE_API_TOKEN||env.CLOUDFLARE_API_KEY)throw Error('PRODUCTION_CREDENTIALS_REFUSED');
  const port=String(env.GMWW_ORACLE_PORT||8787);
  if(!/^[0-9]+$/.test(port)||Number(port)<1024||Number(port)>65535)throw Error('INVALID_LOCAL_PORT');
  return 'http://127.0.0.1:'+Number(port);
}
async function checkpointPath(env){
  const root=env.GMWW_ORACLE_STATE_DIR;
  if(typeof root!=='string'||!root.startsWith('/')||root==='/')throw Error('ISOLATED_STATE_DIR_REQUIRED');
  const actual=await realpath(root),marker=await readFile(join(actual,'.gmww-oracle-staging-only'),'utf8');
  assert.equal(marker.trim(),'GMWW-ORACLE-STAGING-ONLY');
  return join(actual,'.oracle-probe-checkpoint.json');
}
async function send(base,path,{method='GET',body,token}={}){
  const headers={};
  if(body!==undefined)headers['content-type']='application/json';
  if(token)headers.authorization='Bearer '+token;
  const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(9000)});
  const result=await res.json().catch(()=>({}));
  return {status:res.status,result};
}
async function assertWebSocket(base,code,participantId){
  assert.ok(globalThis.WebSocket,'Node 22 WebSocket support required');
  const url=base.replace(/^http:/,'ws:')+'/ws/'+code+'?participantId='+encodeURIComponent(participantId);
  await new Promise((resolve,reject)=>{
    const ws=new WebSocket(url);
    let state=false,pong=false;
    const timer=setTimeout(()=>finish(new Error('LOCAL_WS_TIMEOUT')),9000);
    const finish=e=>{clearTimeout(timer);try{ws.close()}catch{};e?reject(e):resolve()};
    ws.addEventListener('error',()=>finish(new Error('LOCAL_WS_ERROR')));
    ws.addEventListener('message',event=>{
      try{
        const msg=JSON.parse(String(event.data));
        if(msg.type==='room_state'){assert.equal(msg.room?.code,code);state=true;ws.send(JSON.stringify({type:'ping'}))}
        if(msg.type==='pong'){pong=true;assert.ok(state);finish()}
      }catch(e){finish(e)}
    });
  });
}
export function stableRoomProjection(response){
  const room=response?.room;
  assert.ok(room&&typeof room==='object'&&/^[A-HJ-NP-Z2-9]{6}$/.test(room.code));
  assert.ok(Array.isArray(response.players),'Room roster must be present');
  const ids=response.players.map(p=>String(p.participantId||'')).sort();
  assert.ok(ids.every(id=>id.length>0)&&new Set(ids).size===ids.length,'Unique player identities required');
  return {room:{code:room.code,roomName:String(room.roomName||''),seatCount:Number(room.seatCount||0),phase:String(room.phase||''),status:String(room.status||'')},participantIds:ids};
}
export async function runLocalProbe(phase,env=process.env){
  if(!['create','resume'].includes(phase))throw Error('INVALID_PROBE_PHASE');
  const base=localUrl(env),file=await checkpointPath(env);
  const health=await send(base,'/api/health');
  assert.equal(health.status,200,'Local Worker health');
  assert.equal(health.result.ok,true);
  const unauth=await send(base,'/api/members/me');
  assert.equal(unauth.status,401,'Member session must reject missing bearer');
  let checkpoint;
  if(phase==='create'){
    const id=randomBytes(4).toString('hex');
    const loginId='orastg'+id;
    const register=await send(base,'/api/members/register',{method:'POST',body:{loginId,displayName:'Oracle '+id,gameCharacterId:'character-01'}});
    assert.equal(register.status,201,'Fixture register '+JSON.stringify(register.result).slice(0,170));
    const room=await send(base,'/api/rooms',{method:'POST',body:{roomName:'Oracle STAGING '+id,roomMode:'online',seatCount:8}});
    assert.equal(room.status,201,'Fixture room '+JSON.stringify(room.result).slice(0,170));
    checkpoint={loginId,roomCode:room.result.roomCode};
    assert.match(checkpoint.roomCode,/^[A-HJ-NP-Z2-9]{6}$/);
  }else{
    checkpoint=JSON.parse(await readFile(file,'utf8'));
    assert.match(checkpoint.loginId,/^orastg[a-f0-9]{8}$/);
    assert.match(checkpoint.roomCode,/^[A-HJ-NP-Z2-9]{6}$/);
  }
  const login=await send(base,'/api/members/login',{method:'POST',body:{loginId:checkpoint.loginId}});
  assert.equal(login.status,200,'Fixture login '+JSON.stringify(login.result).slice(0,170));
  assert.ok(login.result.token,'Local login token present');
  const me=await send(base,'/api/members/me',{token:login.result.token});
  assert.equal(me.status,200);
  assert.equal(me.result.member.loginId,checkpoint.loginId);
  const room=await send(base,'/api/rooms/'+checkpoint.roomCode);
  assert.equal(room.status,200,'Persisted room exists');
  assert.equal(room.result.room?.code,checkpoint.roomCode);
  const join=await send(base,'/api/rooms/'+checkpoint.roomCode+'/join',{method:'POST',body:{token:login.result.token}});
  assert.equal(join.status,200,'Fixture room join');
  assert.equal(join.result.player?.participantId,'member:'+checkpoint.loginId);
  await assertWebSocket(base,checkpoint.roomCode,join.result.player.participantId);
  // Compare only the safe, stable public room projection. This is NOT full DO migration.
  const current=await send(base,'/api/rooms/'+checkpoint.roomCode);
  assert.equal(current.status,200);
  const projection=stableRoomProjection(current.result),store=await fixtureStore(env.GMWW_ORACLE_STATE_DIR);
  assert.equal(projection.room.code,checkpoint.roomCode);
  const snapshot=snapshotFixture({code:checkpoint.roomCode,revision:0,phase:'lobby',activeMatch:false,
    sourceSha:env.GITHUB_SHA,engineVersion:health.result.version,data:projection});
  if(phase==='create')await store.write(snapshot);
  else{
    const previous=await store.read(checkpoint.roomCode);
    assert.ok(previous,'Missing original room fixture snapshot');
    assert.equal(previous.digest,snapshot.digest,'Room public projection drifted after restart');
  }
  if(phase==='create')await writeFile(file,JSON.stringify(checkpoint),{mode:0o600,flag:'wx'});
  return {ok:true,phase,roomCode:checkpoint.roomCode,authenticated:true,websocket:true,persistent:phase==='resume',reconciled:true,liveSwitch:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  runLocalProbe(process.argv[2]).then(x=>console.log(JSON.stringify(x)),e=>{console.error('Oracle LOCAL probe FAILED:',e.message);process.exitCode=1});
}
