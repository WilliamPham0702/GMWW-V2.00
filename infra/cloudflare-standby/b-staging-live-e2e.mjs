/**
 * SERVER-3: LIVE GitHub-hosted synthetic-only Cloudflare B E2E.
 * Endpoint is hard-locked; no A origin, account API, deployment or DNS writes.
 * A missing GitHub secret is BLOCKED, never a false E2E PASS.
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

export const STAGING_BASE = 'https://gmww-b-staging-synthetic.gmww-stage-b-0702-2026.workers.dev';
const HOST = new URL(STAGING_BASE).host;
const TIMEOUT = 12000;
const RUN_ID = (process.env.GITHUB_RUN_ID || 'manual').replace(/[^0-9a-z-]/gi, '').slice(0,32);

export function assertBUrl(path) {
  assert.match(path, /^\/([a-z0-9/?=&_-]*)$/i, 'Relative B path only');
  const u = new URL(path, STAGING_BASE);
  assert.equal(u.hostname, HOST, 'Only Cloudflare B synthetic hostname is permitted');
  assert.equal(u.protocol, 'https:');
  return u.href;
}

async function api(path, {method='GET', fixtureKey, sessionToken, body} = {}) {
  const headers = {'accept': 'application/json'};
  if (fixtureKey) headers['x-gmww-b-fixture-key'] = fixtureKey;
  if (sessionToken) headers.authorization = 'Bearer ' + sessionToken;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(assertBUrl(path), {method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT), redirect:'error'});
  let data;
  try { data = await res.json(); } catch { throw Error('B returned non-JSON (HTTP ' + res.status + ')'); }
  return {status:res.status, data};
}
function check(res, expected, tag) {
  assert.equal(res.status, expected, tag + ' HTTP status mismatch');
  assert.equal(res.data?.environment, 'cloudflare-b', tag + ' origin mismatch');
  assert.equal(res.data?.productionSwitchAllowed, false, tag + ' must never enable failover');
  return res.data;
}
export async function publicChecks(request = api) {
  const health = check(await request('/health'), 200, 'B health');
  assert.equal(health.ok, true);
  assert.equal(health.mode, 'synthetic-only');
  assert.equal(health.productionDataConnected, false);
  assert.equal(health.loginSessionVerified, false);
  assert.equal(health.websocketVerified, false);
  check(await request('/qa/login', {method:'POST', body:{fixtureOnly:true, persona:'gm'}}), 401, 'No fixture key');
  check(await request('/qa/login', {method:'POST', fixtureKey:'deliberately-invalid-key', body:{fixtureOnly:true, persona:'gm'}}), 401, 'Wrong fixture key');
  console.log('PUBLIC B E2E PASS: health and authentication denial; full login/WS NOT yet proven.');
}

function expectMessage(socket, predicate, label) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{clean();reject(Error(label+' timeout'));},TIMEOUT);
    function clean(){clearTimeout(timer);socket.removeEventListener('message',onMessage);socket.removeEventListener('error',onError);}
    function onError(){clean();reject(Error(label+' WebSocket error'));}
    function onMessage(event){
      let value;try{value=JSON.parse(String(event.data));}catch{return;}
      if(predicate(value)){clean();resolve(value);}
    }
    socket.addEventListener('message',onMessage);
    socket.addEventListener('error',onError);
  });
}
async function openWebSocket(ticket) {
  assert.match(ticket, /^[a-f0-9]{64}$/, 'One-time B WS ticket format');
  const url=assertBUrl('/qa/ws?ticket='+ticket).replace(/^https:/, 'wss:');
  const socket=new WebSocket(url);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{clean();socket.close();reject(Error('B WebSocket open timeout'));},TIMEOUT);
    function clean(){clearTimeout(timer);socket.removeEventListener('open',opened);socket.removeEventListener('error',failed);}
    function opened(){clean();resolve();}
    function failed(){clean();reject(Error('B WebSocket handshake rejected'));}
    socket.addEventListener('open',opened);
    socket.addEventListener('error',failed);
  });
  return socket;
}
async function closeSocket(socket){
  if(!socket||socket.readyState===WebSocket.CLOSED)return;
  if(socket.readyState===WebSocket.CLOSING)return;
  await new Promise(resolve=>{
    const timer=setTimeout(resolve,2500);
    socket.addEventListener('close',()=>{clearTimeout(timer);resolve();},{once:true});
    socket.close(1000);
  });
}
export async function fullChecks(key, request=api) {
  if(typeof key!=='string'||key.length<32)throw Error('BLOCKED: GitHub secret GMWW_B_SYNTHETIC_ADMIN_KEY absent/invalid; cannot run protected B E2E');
  const post=(path,body,sessionToken)=>request(path,{method:'POST',fixtureKey:key,sessionToken,body});
  const get=(path,sessionToken)=>request(path,{fixtureKey:key,sessionToken});
  let gm, room, gmSocket,playerSocket;
  try {
    gm=check(await post('/qa/login',{fixtureOnly:true,persona:'gm'}),200,'GM login').token;
    const player=check(await post('/qa/login',{fixtureOnly:true,persona:'player'}),200,'Player login').token;
    const outsider=check(await post('/qa/login',{fixtureOnly:true,persona:'player'}),200,'Outsider login').token;
    assert.match(gm,/^syn_[a-f0-9]{64}$/);
    assert.match(player,/^syn_[a-f0-9]{64}$/);
    check(await post('/qa/rooms',{},player),403,'Player cannot create room');
    room=check(await post('/qa/rooms',{},gm),201,'GM room create').roomCode;
    assert.match(room,/^[A-HJ-NP-Z2-9]{6}$/);
    check(await post('/qa/chat',{roomCode:room,message:'not-joined'},outsider),403,'Outsider denied');
    check(await post('/qa/join',{roomCode:room},player),200,'Player join');
    const msg='GMWW-B-only-'+RUN_ID;
    check(await post('/qa/chat',{roomCode:room,message:msg},player),200,'HTTP chat');
    const history=check(await get('/qa/messages?roomCode='+room,gm),200,'History');
    assert.ok(history.messages.some(m=>m.message===msg), 'HTTP chat must be visible to GM');
    check(await get('/qa/messages?roomCode='+room,outsider),403,'Outsider history denied');
    const gmTicket=check(await post('/qa/ws-ticket',{roomCode:room},gm),200,'GM WS ticket').ticket;
    const playerTicket=check(await post('/qa/ws-ticket',{roomCode:room},player),200,'Player WS ticket').ticket;
    gmSocket=await openWebSocket(gmTicket);
    playerSocket=await openWebSocket(playerTicket);
    const pong=expectMessage(gmSocket,m=>m.type==='pong','WS ping/pong');
    gmSocket.send(JSON.stringify({type:'ping'}));
    assert.equal((await pong).syntheticOnly,true);
    const wsText='WS-B-'+RUN_ID;
    const gotGM=expectMessage(gmSocket,m=>m.type==='chat'&&m.message===wsText,'GM broadcast');
    const gotPlayer=expectMessage(playerSocket,m=>m.type==='chat'&&m.message===wsText,'Player broadcast');
    playerSocket.send(JSON.stringify({type:'chat',message:wsText}));
    await Promise.all([gotGM,gotPlayer]);
    await closeSocket(gmSocket);
    gmSocket=undefined;
    const reconnectTicket=check(await post('/qa/ws-ticket',{roomCode:room},gm),200,'Reconnection WS ticket').ticket;
    gmSocket=await openWebSocket(reconnectTicket);
    const afterReconnection=expectMessage(gmSocket,m=>m.type==='chat'&&m.message==='reconnected-'+RUN_ID,'Reconnect broadcast');
    playerSocket.send(JSON.stringify({type:'chat',message:'reconnected-'+RUN_ID}));
    await afterReconnection;
    const rehistory=check(await get('/qa/messages?roomCode='+room,gm),200,'Reconnect history');
    assert.ok(rehistory.messages.some(m=>m.message==='reconnected-'+RUN_ID),'Reconnect history lost');
    console.log('FULL LIVE B E2E PASS: GM/Player login, session, room, permission checks, HTTP chat, WS ping/broadcast, reconnect and history.');
  }finally{
    await Promise.allSettled([closeSocket(gmSocket),closeSocket(playerSocket)]);
    if(gm){
      // B disposable fixture state only; never touches Production A.
      try{
        const result=await post('/qa/reset',{fixtureOnly:true},gm);
        check(result,200,'Synthetic B cleanup');
        console.log('Synthetic B QA state reset.');
      }catch(e){console.error('Synthetic fixture cleanup failed:',e.message);throw e;}
    }
  }
}
async function main(){
  await publicChecks();
  const key=process.env.GMWW_B_SYNTHETIC_ADMIN_KEY;
  if(!key){console.error('BLOCKED: missing matching GitHub Actions secret GMWW_B_SYNTHETIC_ADMIN_KEY; public probes passed, protected E2E not attempted.');process.exitCode=2;return;}
  await fullChecks(key);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error('B LIVE E2E FAIL/BLOCKED:',error.message);process.exitCode=1;});
}
