import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('server-game/src/20-members-and-roster.part','utf8');
const build=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const arena=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const origin='https://gmww-v2-00.williampham0702.workers.dev';
const begin='const GMWW_ARENA_OFFICIAL_ORIGIN=';
function bridgeFrom(s){
 const i=s.indexOf(begin),end=s.indexOf('\nfunction playLiveMembers()',i);
 assert.ok(i>0&&end>i, 'Only use the live GM state scope before playLiveMembers');
 return s.slice(i,end);
}
function runBridge({originOfSender=origin,token='AbCdEFGH1234567890',code='ABCDEF',hidden=false,badFrame=false}={}){
 const outbound=[],listeners=[],frame={
  isConnected:true,closest:()=>hidden?{hidden:true}:null,
  contentWindow:{postMessage:(data,destination)=>outbound.push({data,destination})}
 };
 const context={window:{addEventListener:(name,fn)=>listeners.push({name,fn})},
  document:{getElementById:(id)=>id==='gmwwArena3dQaFrame'&&!badFrame?frame:null},
  playSceneState:{roomCode:code,gmToken:token},
  isLivePlayRoom:()=>/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)};
 vm.runInNewContext(bridgeFrom(source),context);
 assert.equal(listeners.length,2,'one ready listener and one strictly authenticated room-adoption listener');
 assert.ok(listeners.every(x=>x.name==='message'));
 const send=(overrides={})=>listeners.forEach(x=>x.fn({
  origin:originOfSender,data:{kind:'gmww-arena3d-ready'},
  source:frame.contentWindow,...overrides
 }));
 return {send,outbound,frame};
}
test('GM app compiled runtime contains exactly the same Arena 3D trusted-frame handoff',()=>{
 assert.equal(bridgeFrom(source),bridgeFrom(build));
 assert.match(html,/const arenaUrl='https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/village\/arena-3d\/live\.html'/);
 assert.doesNotMatch(html,/gmww-arena3d-stage14-staging\.williampham0702\.workers\.dev/);
 assert.match(html,/frame\.id='gmwwArena3dQaFrame'/);
 assert.match(arena,/window\.parent\.postMessage\(\{kind:'gmww-arena3d-ready'\},'\*'\)/);
 assert.match(arena,/validateArenaGmContext\(event\.data/);
 assert.match(arena,/if\(!verified\.ok\)throw Error/);
 assert.match(html,/event\.origin!==new URL\(arenaUrl\)\.origin/);
 assert.match(html,/event\.source!==frame\?\.contentWindow/);
 assert.match(html,/event\.data\?\.kind!=='gmww-arena3d-open-setup'/);
 assert.match(html,/closeArena\(true\)/);
 assert.match(arena,/window\.parent\.postMessage\(\{kind:'gmww-arena3d-open-setup'\},location\.origin\)/);
});
test('Official iframe receives only selected current room GM token, exactly one origin-scoped postMessage',()=>{
 const x=runBridge();x.send();
 assert.equal(x.outbound.length,1);
 assert.equal(x.outbound[0].destination,origin);
 assert.deepEqual(JSON.parse(JSON.stringify(x.outbound[0].data)),{
  kind:'gmww-arena3d-gm-context',roomCode:'ABCDEF',gmToken:'AbCdEFGH1234567890'
 });
 assert.doesNotMatch(html,/\?gmToken=|\?token=|sessionStorage\.setItem\(.+gm/);
});
test('Bridge fails closed for spoofed origin/source, hidden/nonexistent iframe and absent real room',()=>{
 const x=runBridge();x.send({origin:'https://evil.example'});x.send({source:{}});x.send({data:{kind:'other'}});assert.equal(x.outbound.length,0);
 for(const opts of [{hidden:true},{badFrame:true},{code:'SYNTH'}, {code:'ABCDEF',token:'short'}, {code:'ABCDEF',token:'bad-token!?'}]){
  const t=runBridge(opts);t.send();assert.equal(t.outbound.length,0,JSON.stringify(opts));
 }
});


test('Arena 3D only opens Core setup in owning same-origin host frame',()=>{
 const start=html.indexOf('  // GMWW keeps the one authoritative Role/Artifact editor');
 const end=html.indexOf('  // Capture BEFORE app.js',start);
 assert.ok(start>0&&end>start);
 const snippet=html.slice(start,end),bound=[];
 const frame={contentWindow:{}},overlay={hidden:false};
 const root={window:{addEventListener:(type,listener)=>bound.push({type,listener})},
   frame,overlay,arenaUrl:origin+'/village/arena-3d/live.html',
   closeArena:flag=>actions.push(flag),URL};
 const actions=[];
 vm.runInNewContext(snippet,root);
 assert.equal(bound.length,2,'setup message and authorized adoption-complete event');
 assert.deepEqual(bound.map(x=>x.type),['message','gmww-arena3d-room-adopted']);
 const event={origin,source:frame.contentWindow,data:{kind:'gmww-arena3d-open-setup'}};
 const receive=bound[0].listener;
 receive({...event,origin:'https://evil.example'});
 receive({...event,source:{}});
 receive({...event,data:{kind:'gmww-arena3d-ready'}});
 overlay.hidden=true;receive(event);
 assert.equal(actions.length,0,'a hidden overlay must never switch the GM workflow');
 overlay.hidden=false;receive(event);
 assert.deepEqual(actions,[true],'legitimate child opens the official GMWW Core setup');
});
