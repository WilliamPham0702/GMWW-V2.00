import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const begin=app.indexOf('/* Validate both release metadata and Worker health');
const end=app.indexOf('\nwindow.GMWWUpdateNative={',begin);
assert.ok(begin>0&&end>begin,'Update verifier is present');
const source=app.slice(begin,end);

function harness({healthFails=false,manifestFails=false,server='V3.53',manifestServer='3.53',latest='3.53',runtime='3.53'}={}){
  const ui=[],actions=[],elements={
    retryUpdateCheck:{disabled:false,setAttribute(){},removeAttribute(){}},
    updateServerVersion:{textContent:'V—'}
  };
  const health={ok:true,project:'GMWW-V2.00',version:server,serverVersion:server};
  const manifest={ok:true,releaseVersion:latest,runtimeVersion:latest,serverVersion:manifestServer,releaseType:'runtime',ipa:null};
  const ctx={
    AbortController,
    setTimeout,clearTimeout,
    gmwwUpdateBusy:false,gmwwUpdateManifest:null,
    GMWW_SERVER_BASE:'https://example.invalid',
    document:{getElementById:id=>elements[id]||null},
    gmwwRuntimeVersion:()=>runtime,
    gmwwShellVersion:()=> '3.17',
    gmwwRenderReleaseNotes:()=>{},
    gmwwVersionCompare:(a,b)=>{const pa=String(a).split('.').map(Number),pb=String(b).split('.').map(Number);for(let i=0;i<3;i++){const d=(pa[i]||0)-(pb[i]||0);if(d)return Math.sign(d)}return 0},
    setUpdateAction:(...args)=>actions.push(args),
    setUpdateUi:(...args)=>ui.push(args),
    console:{warn(){}},
    fetch:async url=>{
      const isHealth=url.includes('/api/health');
      if((isHealth&&healthFails)||(!isHealth&&manifestFails))throw new Error('OFFLINE');
      return{ok:true,json:async()=>isHealth?health:manifest};
    }
  };
  vm.runInNewContext(source+'\nglobalThis.runCheck=checkAppUpdate;globalThis.getManifest=()=>gmwwUpdateManifest;',ctx);
  return{run:ctx.runCheck,manifest:ctx.getManifest,ui,actions,elements};
}
test('V3.53 only declares latest after Server and release version both agree',async()=>{
  const h=harness(),m=await h.run();
  assert.equal(m.releaseVersion,'3.53');
  assert.equal(h.ui.at(-1)[0],'ok');
  assert.equal(h.elements.updateServerVersion.textContent,'V3.53');
  assert.match(h.ui.at(-1)[2],/Game Runtime V3.53/);
  assert.equal(h.elements.retryUpdateCheck.disabled,false);
});
test('V3.53 never says latest when Server health cannot be verified',async()=>{
  const h=harness({healthFails:true});
  assert.equal(await h.run(),null);
  assert.equal(h.ui.at(-1)[0],'warn');
  assert.doesNotMatch(h.ui.at(-1)[2],/mới nhất/);
  assert.match(h.actions.at(-1)[0],/unverified/);
  assert.equal(h.elements.updateServerVersion.textContent,'V—');
  assert.equal(h.manifest(),null);
});
test('V3.53 shows a verified Server version even if release manifest fails',async()=>{
  const h=harness({manifestFails:true});
  assert.equal(await h.run(),null);
  assert.equal(h.ui.at(-1)[0],'warn');
  assert.equal(h.elements.updateServerVersion.textContent,'V3.53');
  assert.equal(h.manifest(),null);
});
test('V3.53 treats a mismatched deployment as unverified',async()=>{
  const h=harness({manifestServer:'3.38'});
  assert.equal(await h.run(),null);
  assert.equal(h.ui.at(-1)[1],'SERVER CHƯA ĐỒNG BỘ');
  assert.equal(h.manifest(),null);
});
test('V3.53 exposes explicit on-screen retry without IPA reinstall',()=>{
  assert.match(html,/id="retryUpdateCheck"/);
  assert.match(app,/retryUpdateCheck\.addEventListener\('click'/);
  assert.match(app,/else if\(kind==='unverified'\)/);
  assert.match(html,/<title>GMWW V3\.53<\/title>/);
});

test('An existing V3.39 install is offered the immutable V3.53 runtime',async()=>{
 const h=harness({runtime:'3.39'}),m=await h.run();
 assert.equal(m.releaseVersion,'3.53');
 assert.equal(h.actions.at(-1)[0],'runtime');
 assert.equal(h.ui.at(-1)[1],'CÓ CẬP NHẬT');
 assert.equal(h.elements.updateServerVersion.textContent,'V3.53');
});

test('An installed V3.40 sees a V3.53 update rather than falsely reporting latest',async()=>{
 const h=harness({runtime:'3.40'}),m=await h.run();
 assert.equal(m?.releaseVersion,'3.53');
 assert.equal(h.actions.at(-1)[0],'runtime');
 assert.equal(h.ui.at(-1)[1],'CÓ CẬP NHẬT');
});

test('An installed V3.44 sees the V3.53 UI fix instead of an identical-version update',async()=>{
 const h=harness({runtime:'3.44'}),m=await h.run();
 assert.equal(m?.releaseVersion,'3.53');
 assert.equal(h.actions.at(-1)[0],'runtime');
});
