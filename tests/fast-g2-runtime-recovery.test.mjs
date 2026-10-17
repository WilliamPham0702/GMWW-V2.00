import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function boot({native=true,shell='3.110',runtime='3.999',stored=null,brokenStorage=false}={}){
  const callbacks=[],messages=[],store=new Map(stored?[['GMWW_RUNTIME_RECOVERY_'+runtime,stored]]:[]);
  const window={GMWW_NATIVE_SHELL_VERSION:shell,webkit:native?{messageHandlers:{gmwwUpdater:{postMessage:m=>messages.push(m)}}}:undefined};
  const document={currentScript:{dataset:{runtime}},body:{appendChild(){}},createElement:()=>({style:{},appendChild(){},addEventListener(){}})};
  const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(brokenStorage)throw Error('storage blocked');store.set(k,v)}};
  const context={window,document,localStorage:storage,setTimeout:f=>(callbacks.push(f),callbacks.length),clearTimeout:()=>{},console};
  vm.runInNewContext(fs.readFileSync('server-game/current/runtime-recovery.js','utf8'),context);
  return {window,messages,store,expire:()=>callbacks.forEach(f=>f())};
}
test('startup failure rolls back OTA once through the existing Native bridge',()=>{
  assert.ok(fs.existsSync('server-game/current/runtime-recovery.js'),'independent recovery bootstrap must exist');
  const b=boot();b.expire();b.expire();
  assert.equal(b.messages.length,1);assert.equal(b.messages[0].action,'rollbackRuntime');
  assert.ok(b.store.has('GMWW_RUNTIME_RECOVERY_3.999'));
});
test('healthy app completion prevents fallback without touching saved data',()=>{
  const b=boot();b.window.GMWWRuntimeRecovery.ready('3.999');b.expire();
  assert.equal(b.messages.length,0);assert.equal(b.store.size,0);
});
test('browser, bundled shell, repeated failure and unavailable marker storage never auto-loop',()=>{
  for(const config of [{native:false},{shell:'3.999'},{shell:'4.0'},{shell:'unknown'},{stored:'attempted'},{brokenStorage:true}]){
    const b=boot(config);b.expire();assert.equal(b.messages.length,0,JSON.stringify(config));
  }
});
test('wrong-version ready notification cannot conceal broken startup',()=>{
  const b=boot();b.window.GMWWRuntimeRecovery.ready('3.998');b.expire();assert.equal(b.messages.length,1);
});
test('recovery is loaded before app and ready signal belongs to app execution',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.ok(html.indexOf('src="runtime-recovery.js')<html.indexOf('src="app.js'));
  assert.match(app,/GMWWRuntimeRecovery\?\.ready\(VERSION\)/);
  const producer=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  assert.match(producer,/copy\('server-game\/current\/runtime-recovery.js','runtime-recovery.js'\)/);
});
