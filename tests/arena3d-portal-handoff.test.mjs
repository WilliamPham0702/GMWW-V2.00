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
 assert.equal(listeners.length,1);
 assert.equal(listeners[0].name,'message');
 const send=(overrides={})=>listeners[0].fn({
  origin:originOfSender,data:{kind:'gmww-arena3d-ready'},
  source:frame.contentWindow,...overrides
 });
 return {send,outbound,frame};
}
test('GM app compiled runtime contains exactly the same Arena 3D trusted-frame handoff',()=>{
 assert.equal(bridgeFrom(source),bridgeFrom(build));
 assert.match(html,/const arenaUrl='https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/village\/arena-3d\/live\.html'/);
 assert.doesNotMatch(html,/gmww-arena3d-stage14-staging\.williampham0702\.workers\.dev/);
 assert.match(html,/id="gmwwArena3dQaFrame"/);
 assert.match(arena,/window\.parent\.postMessage\(\{kind:'gmww-arena3d-ready'\},'\*'\)/);
 assert.match(arena,/validateArenaGmContext\(event\.data/);
 assert.match(arena,/if\(!verified\.ok\)throw Error/);
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
