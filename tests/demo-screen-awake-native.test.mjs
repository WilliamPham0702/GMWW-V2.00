import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const native=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
const source=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const fragment=source.slice(source.indexOf('let demoScreenAwakeSent='),source.indexOf('const demoPick=rows=>'));
assert.ok(fragment.startsWith('let demoScreenAwakeSent='),'Missing DEMO idle-timer helper');

function harness({withNative=true}={}){
  const messages=[],listeners={};
  const ctx={
    demoRunner:{running:false},
    playSceneState:{step:'battle'},
    playSceneRuntime:{room:{demo:true,phase:'running'}},
    document:{visibilityState:'visible',addEventListener:(name,fn)=>{listeners[name]=fn}},
    window:{webkit:withNative?{messageHandlers:{gmwwScreen:{postMessage:m=>messages.push(m)}}}:{},addEventListener:(name,fn)=>{listeners[name]=fn}},
    console:{warn:()=>{}}
  };
  const sync=vm.runInNewContext(fragment+';demoSyncScreenAwake',ctx);
  return {ctx,sync,messages,listeners};
}

test('Wake-lock bridge toggles on DEMO play, stops on pause/room exit, and deduplicates unchanged state',()=>{
  const h=harness();h.sync();assert.equal(h.messages.at(-1).enabled,false);
  h.ctx.demoRunner.running=true;h.sync();assert.equal(h.messages.at(-1).enabled,true);
  h.sync();assert.equal(h.messages.length,2,'should not poll or duplicate bridge messages');
  h.ctx.demoRunner.running=false;h.sync();assert.equal(h.messages.at(-1).enabled,false);
  h.ctx.demoRunner.running=true;h.ctx.playSceneState.step='seats';h.sync();assert.equal(h.messages.at(-1).enabled,false);
  h.ctx.playSceneState.step='battle';h.ctx.playSceneRuntime.room.phase='finished';h.sync();assert.equal(h.messages.at(-1).enabled,false);
  h.ctx.playSceneRuntime.room.phase='running';h.ctx.playSceneRuntime.room.demo=false;h.sync();assert.equal(h.messages.at(-1).enabled,false);
});

test('Visibility/background and page unload release display; no camera, continuous timer or hardware scanning',()=>{
  const h=harness();h.ctx.demoRunner.running=true;h.sync();
  h.ctx.document.visibilityState='hidden';h.listeners.visibilitychange();
  assert.equal(h.messages.at(-1).enabled,false);
  h.ctx.document.visibilityState='visible';h.listeners.visibilitychange();
  assert.equal(h.messages.at(-1).enabled,true);
  h.listeners.pagehide();assert.equal(h.messages.at(-1).enabled,false);
  assert.doesNotMatch(fragment,/getUserMedia|setInterval|faceDetector|camera/i);
});

test('Native shell handles lifecycle, reload, crash, and only accepts trusted main-frame commands',()=>{
  for(const key of ['gmwwScreen','setDemoAwake','message.frameInfo.isMainFrame',
    'UIApplication.shared.isIdleTimerDisabled','UIApplication.willResignActiveNotification',
    'UIApplication.didBecomeActiveNotification','stopObservingAppState()',
    'didStartProvisionalNavigation','webViewWebContentProcessDidTerminate']){
    assert.ok(native.includes(key),'missing native safety check: '+key);
  }
  assert.match(native,/demoAwakeRequested && UIApplication.shared.applicationState == \.active/);
  assert.match(native,/appWillResignActive[\s\S]*?UIApplication\.shared\.isIdleTimerDisabled = false/);
  assert.ok(app.includes(source),'IPA bundled runtime and source DEMO logic must match');
  assert.match(source,/demoRunner\.running=false;demoRunner\.epoch\+\+;demoStopTimer\(\);demoSyncScreenAwake\(\);/);
});

test('Browser and old IPA without native bridge preserve system Auto-Lock',()=>{
  const h=harness({withNative:false});h.ctx.demoRunner.running=true;h.sync();assert.equal(h.messages.length,0);
});
