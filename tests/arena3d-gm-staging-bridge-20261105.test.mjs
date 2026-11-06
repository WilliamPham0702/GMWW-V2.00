// PR #581 (05/11/2026): GM VÀO LÀNG → Arena 3D on STAGING, Player entry, staging Runtime flavor.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {stagingAppJs,stagingHtml,STAGING_BASE,PRODUCTION_BASE} from '../.github/scripts/build-arena3d-staging-runtime.mjs';
import {injectArena3dPlayerEntry,isPlayerPagePath,ARENA3D_PLAYER_ENTRY_ID} from '../src/arena3d-player-entry.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const part=read('server-game/src/30-village-and-setup.part');
const app=read('server-game/current/app.js');
const portal=read('server-game/current/GMWW.html');
const arena=read('assets/village/arena-3d/live.mjs');
const worker=read('src/arena3d-stage-worker.mjs');
const MARK='// Arena 3D bridge (PR #581).';
const bridge=src=>{const i=src.indexOf(MARK);assert.ok(i>=0,'missing bridge');return src.slice(i)};

test('Bridge source is identical in .part and assembled app; no token in URL or storage',()=>{
  assert.ok(app.includes(bridge(part)));
  const b=bridge(part);
  assert.match(b,/new URL\(GMWW_SERVER_BASE\)\.origin/);
  assert.doesNotMatch(b,/\?gmToken=|searchParams|localStorage\.setItem\([^)]*token/i);
});

test('Production Runtime unchanged: server base and QA arena URL stay as before',()=>{
  assert.match(app,/const GMWW_SERVER_BASE='https:\/\/gmww-v2-00\.williampham0702\.workers\.dev'/);
  assert.match(portal,/const arenaUrl='https:\/\/gmww-arena3d-stage14-staging\.williampham0702\.workers\.dev\/village\/arena-3d\/live\.html';/);
  assert.match(portal,/window\.addEventListener\('gmww-arena3d-room-adopted'/);
});

test('STAGING flavor points GM to STAGING Core and opens same-origin 3D in live Core mode',()=>{
  const a=stagingAppJs(app,'3.304.1'),h=stagingHtml(portal);
  assert.ok(a.includes("const GMWW_SERVER_BASE='"+STAGING_BASE+"'"));
  assert.ok(!a.includes("const GMWW_SERVER_BASE='"+PRODUCTION_BASE+"'"));
  assert.match(a,/const VERSION='3\.304\.1'/);
  assert.ok(h.includes(STAGING_BASE+"/village/arena-3d/live.html?coreMode=live'"));
  assert.match(h,/id="gmwwArena3dStagingBadge"/);
  // Bridge origin == arena origin in the flavor, so the handlers become active.
  assert.equal(new URL(STAGING_BASE).origin,new URL(STAGING_BASE+'/village/arena-3d/live.html').origin);
});

function scenario({origin=STAGING_BASE,http=200,wrongCode=false,hidden=false,live=true}={}){
  const listeners=[],fetches=[],calls=[],posted=[];
  const frame={isConnected:true,closest:()=>hidden?{}:null,contentWindow:{postMessage:(p,o)=>posted.push({p,o})}};
  const ctx={
    GMWW_SERVER_BASE:STAGING_BASE,URL,
    playSceneState:{roomCode:'ABCDEF',gmToken:'Valid_GM_1234567890'},
    isLivePlayRoom:()=>live,
    window:{addEventListener:(n,fn)=>listeners.push(fn),dispatchEvent:e=>calls.push(['event',e.type])},
    document:{getElementById:id=>id==='gmwwArena3dQaFrame'?frame:null},
    fetch:async(url,opts)=>{fetches.push({url,opts});return{ok:http===200,status:http,
      json:async()=>({ok:http===200,room:{code:wrongCode?'WRONGQ':'QWERTY',seatCount:12,roomMode:'online'}})}},
    rememberPlayRoom:(...a)=>calls.push(['remember',...a]),
    selectPlayExistingRoom:async r=>calls.push(['select',r.roomCode,r.gmToken]),
    Event:class{constructor(t){this.type=t}}
  };
  vm.runInNewContext(bridge(part),ctx);
  const send=data=>Promise.all(listeners.map(fn=>fn({origin,source:frame.contentWindow,data})));
  return {send,fetches,calls,posted};
}

test('Ready handshake sends selected room context once, only to the STAGING origin',async()=>{
  const s=scenario();
  await s.send({kind:'gmww-arena3d-ready'});
  assert.equal(s.posted.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(s.posted[0])),{p:{kind:'gmww-arena3d-gm-context',roomCode:'ABCDEF',gmToken:'Valid_GM_1234567890'},o:STAGING_BASE});
  const evil=scenario({origin:'https://evil.example'});await evil.send({kind:'gmww-arena3d-ready'});
  assert.equal(evil.posted.length,0);
  const prod=scenario({origin:PRODUCTION_BASE});await prod.send({kind:'gmww-arena3d-ready'});
  assert.equal(prod.posted.length,0);
  const none=scenario({live:false});await none.send({kind:'gmww-arena3d-ready'});
  assert.equal(none.posted.length,0);
});

test('3D-created room is adopted only after Core verifies the bearer',async()=>{
  const s=scenario();
  await s.send({kind:'gmww-arena3d-adopt-room',roomCode:'qwerty',gmToken:'New_GM_token_123456'});
  assert.equal(s.fetches.length,1);
  assert.equal(s.fetches[0].url,STAGING_BASE+'/api/gm/rooms/QWERTY');
  assert.equal(s.fetches[0].opts.headers.Authorization,'Bearer New_GM_token_123456');
  assert.deepEqual(s.calls.map(c=>c[0]),['remember','select','event']);
  assert.deepEqual(s.calls[1],['select','QWERTY','New_GM_token_123456']);
});

test('Denied, mismatched, hidden, spoofed or malformed adoption never selects a room',async()=>{
  for(const opt of [{http:403},{wrongCode:true}]){
    const s=scenario(opt);
    await s.send({kind:'gmww-arena3d-adopt-room',roomCode:'QWERTY',gmToken:'New_GM_token_123456'});
    assert.ok(!s.calls.some(c=>c[0]==='select'));
    assert.equal(s.posted.at(-1).p.kind,'gmww-arena3d-adopt-failed');
  }
  for(const opt of [{hidden:true},{origin:'https://evil.example'}]){
    const s=scenario(opt);
    await s.send({kind:'gmww-arena3d-adopt-room',roomCode:'QWERTY',gmToken:'New_GM_token_123456'});
    assert.equal(s.fetches.length,0);
  }
  const bad=scenario();
  await bad.send({kind:'gmww-arena3d-adopt-room',roomCode:'../X',gmToken:'bad token'});
  assert.equal(bad.fetches.length,0);
});

test('3D GM addresses the file:// native host by its real ancestor origin',()=>{
  assert.match(arena,/function parentTargetOrigin\(\)/);
  assert.match(arena,/ancestor==='null'\|\|ancestor\.startsWith\('file:'\)\)return '\*'/);
  assert.match(arena,/kind:'gmww-arena3d-adopt-room',roomCode:code,gmToken\},host\)/);
  assert.doesNotMatch(arena,/gmww-arena3d-adopt-room',roomCode:code,gmToken\},location\.origin\)/);
  assert.match(arena,/gmww-arena3d-adopt-failed/);
});

test('Player entry: injected once on Player pages, inert inside the 3D sheet',()=>{
  const html='<html><body><main></main></body></html>';
  const once=injectArena3dPlayerEntry(html);
  assert.equal(injectArena3dPlayerEntry(once),once);
  assert.ok(once.indexOf(ARENA3D_PLAYER_ENTRY_ID)<once.indexOf('</body>'));
  assert.match(once,/if\(window\.top!==window\)return;/);
  assert.match(once,/\/village\/arena-3d\/player\.html\?room='/);
  assert.doesNotMatch(once,/token|gmToken/i);
  assert.ok(isPlayerPagePath('/')&&isPlayerPagePath('/join/ABCDEF'));
  assert.ok(!isPlayerPagePath('/api/rooms')&&!isPlayerPagePath('/village/arena-3d/player.html'));
  assert.match(worker,/isPlayerPagePath\(url\.pathname\)/);
});

test('Player entry script only reads public room membership and redirects once per room (GM chọn 3D)',async()=>{
  const script=injectArena3dPlayerEntry('<body></body>').match(/<script id="gmww-arena3d-player-entry">([\s\S]*?)<\/script>/)[1];
  const nav=[],store={};let tick=null;
  const body={appendChild(){}};
  const ctx={state:{roomCode:'abcdef',participantId:'p1'},
    location:{set href(v){nav.push(v)}},
    document:{createElement:()=>({style:{},setAttribute(){},addEventListener(){}}),body},
    sessionStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},
    fetch:async()=>({ok:true,json:async()=>({mode:'3d'})}),
    setInterval:fn=>{tick=fn}};
  ctx.window=ctx;ctx.top=ctx; // top-level Player page
  vm.runInNewContext(script,ctx);
  tick();await new Promise(r=>setTimeout(r,5));tick();tick();
  assert.deepEqual(nav,['/village/arena-3d/player.html?room=ABCDEF']);
  const framed={...ctx,top:{}};framed.window=framed;let ran=false;framed.setInterval=()=>{ran=true};
  vm.runInNewContext(script,framed);
  assert.equal(ran,false);
});

test('Built STAGING package passes the native Runtime verifier rules',{skip:!fs.existsSync('assets/updates/runtime/V3.304/manual-manifest.json')},async()=>{
  const {buildStagingRuntime}=await import('../.github/scripts/build-arena3d-staging-runtime.mjs');
  const {verifyPackage}=await import('../.github/runtime-release/verify-package.mjs');
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'a3d-rt-'));
  const pkg=buildStagingRuntime('assets/updates/runtime/V3.304',path.join(out,'rt'),'3.304.1');
  verifyPackage(path.join(out,'rt','manual-manifest.json'),pkg);
  fs.rmSync(out,{recursive:true,force:true});
});
