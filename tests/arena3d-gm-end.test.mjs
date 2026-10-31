import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const html=readFileSync('assets/village/arena-3d/live.html','utf8');
const core=readFileSync('src/index.js','utf8');
const from=src.indexOf("$('end-match').onclick=");
const to=src.indexOf("for(const button of document.querySelectorAll('[data-roster]'))",from);
assert.ok(from>0&&to>from,'Real GM 3D end-match handler must be present');
const handler=src.slice(from,to);
function scene({authorized=true,phase='running',matchId='match-3d-test',winner='Phe Dân',allow=true}={}){
  let requests=[],refreshed=0,notices=[],confirmations=0;
  const elements={'end-match':{},'winner-faction':{value:winner}};
  const state={room:{phase,matchId}};
  const scope={$:id=>elements[id],code:'ABCDEF',gmToken:authorized?'real-core-gm-token':'',
    feed:{state:{current:state},refresh:async()=>{refreshed++}},
    guarded:(_label,work)=>work(),
    window:{confirm:message=>{confirmations++;return allow}},
    gm:async(path,payload)=>{requests.push({path,payload});return {ok:true}},
    notice:message=>notices.push(message)};
  vm.runInNewContext(handler,scope);
  return {invoke:()=>elements['end-match'].onclick(),elements,get requests(){return requests},
    get refreshed(){return refreshed},get confirmations(){return confirmations},
    get notices(){return notices}};
}
test('Arena 3D contains a real GM end-match control with explicit winner choice',()=>{
  assert.match(html,/id="end-match"[^>]*disabled/);
  assert.match(html,/id="winner-faction"[^>]*disabled/);
  for(const faction of ['Phe Dân','Phe Sói','Phe Ba','Phe Khác'])assert.ok(html.includes('value="'+faction+'"'));
  assert.match(src,/\['seed','lock','deal','start','night','day','nominate','vote','end-match','winner-faction'\]/);
  assert.match(core,/async gmEnd\(request,body\)/);
  assert.match(core,/winnerFaction=normalizeWinnerFaction\(body\?\.winnerFaction/);
});
test('GM 3D ending is denied without authenticated GM, active match or valid winner',async()=>{
  for(const args of [{authorized:false},{phase:'lobby'},{matchId:''},{winner:''},{winner:'unknown'}]){
    const s=scene(args);
    await assert.rejects(()=>s.invoke());
    assert.equal(s.requests.length,0,JSON.stringify(args));
    assert.equal(s.confirmations,0);
  }
});
test('GM can cancel finish, without mutating authoritative Core',async()=>{
  const s=scene({allow:false});
  await s.invoke();
  assert.equal(s.requests.length,0);
  assert.equal(s.refreshed,0);
  assert.equal(s.confirmations,1);
});
test('GM explicitly finalizes via Core /gm/end with current matchId and chosen winner',async()=>{
  const s=scene({winner:'Phe Sói'});
  await s.invoke();
  assert.equal(s.confirmations,1);
  assert.deepEqual(JSON.parse(JSON.stringify(s.requests)),[{
    path:'end',payload:{matchId:'match-3d-test',winnerFaction:'Phe Sói',winner:'Phe Sói'}
  }]);
  assert.equal(s.refreshed,1);
  assert.equal(s.elements['winner-faction'].value,'');
  assert.match(s.notices.at(-1),/Đã kết thúc ván trên Core/);
});
