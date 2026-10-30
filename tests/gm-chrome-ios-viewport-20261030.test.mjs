import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// GM Server stage (the six-step "Sảnh chờ → Vào Trận" timeline), not Player Web.
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const style=html.match(/<style id="gmwwChromeViewportLock">([\s\S]*?)<\/style>/)?.[1];
const script=html.match(/<script id="gmwwChromeViewportScript">([\s\S]*?)<\/script>/)?.[1];

function launch(userAgent){
  const variables=new Map(),listeners={},viewportListeners={},classes=new Set();
  const root={clientHeight:900,style:{setProperty:(key,value)=>variables.set(key,value)},classList:{add:value=>classes.add(value)}};
  const document={documentElement:root,addEventListener:(name,fn)=>listeners['document:'+name]=fn};
  const visualViewport={height:600,offsetTop:0,addEventListener:(name,fn)=>viewportListeners[name]=fn};
  const window={innerHeight:900,visualViewport,requestAnimationFrame:fn=>fn(),addEventListener:(name,fn)=>listeners[name]=fn};
  runInNewContext(script,{navigator:{userAgent},window,document});
  return{root,variables,listeners,viewportListeners,visualViewport,classes};
}

test('GM Server stage is the six-step timeline from the reported screenshot',()=>{
  assert.match(html,/id="playSetupStrip"/);
  assert.match(html,/Sảnh chờ/);
  assert.match(html,/Vào Trận/);
  assert.match(css,/#app\{height:100dvh/);
  assert.match(css,/body\.play-immersive #start \.play-shell\{[^}]*height:100dvh/);
});

test('Chrome iPhone uses the measured visual viewport rather than oversized 100dvh',()=>{
  assert.ok(style&&script,'viewport patch must ship in the GM Server HTML');
  assert.match(style,/html\.gmww-ios-chrome #app\{/);
  assert.match(style,/height:var\(--gmww-gm-visible-height,100dvh\)!important/);
  assert.match(style,/html\.gmww-ios-chrome body\.play-immersive #start\.play-page\.active/);
  assert.match(style,/position:absolute!important;inset:0!important;height:100%!important/);
  assert.match(style,/html\.gmww-ios-chrome body\.play-immersive #start \.play-shell/);
  assert.match(style,/#stage\{height:100%!important/);
  const ctx=launch('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130 Mobile Safari/604.1');
  assert.ok(ctx.classes.has('gmww-ios-chrome'));
  assert.equal(ctx.variables.get('--gmww-gm-visible-height'),'600px');
  assert.equal(ctx.variables.get('--gmww-gm-visible-top'),'0px');
  assert.equal(typeof ctx.viewportListeners.resize,'function');
  assert.equal(typeof ctx.viewportListeners.scroll,'function');
  ctx.visualViewport.height=390;
  ctx.visualViewport.offsetTop=42;
  ctx.viewportListeners.resize();
  assert.equal(ctx.variables.get('--gmww-gm-visible-height'),'390px');
  assert.equal(ctx.variables.get('--gmww-gm-visible-top'),'42px');
  ctx.visualViewport.height=720;ctx.visualViewport.offsetTop=0;ctx.viewportListeners.scroll();
  assert.equal(ctx.variables.get('--gmww-gm-visible-height'),'720px');
  assert.equal(ctx.variables.get('--gmww-gm-visible-top'),'0px');
  assert.equal(typeof ctx.listeners.orientationchange,'function');
  assert.equal(typeof ctx.listeners['document:focusin'],'function');
});

test('Safari, Edge and desktop browsers retain their current GM/IPA viewport',()=>{
  assert.ok(script);
  for(const ua of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Mobile Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 EdgiOS/130 Mobile Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Chrome/130 Safari/605.1'
  ]){
    const ctx=launch(ua);
    assert.equal(ctx.classes.size,0);
    assert.equal(ctx.variables.size,0);
    assert.equal(Object.keys(ctx.listeners).length,0);
  }
});

test('Chrome document cannot page-scroll, but non-game screens keep internal scroll',()=>{
  assert.match(style,/html\.gmww-ios-chrome,html\.gmww-ios-chrome body\{[^}]*overflow:hidden!important/);
  assert.match(style,/html\.gmww-ios-chrome #app\{[^}]*overflow:hidden!important/);
  assert.match(css,/\.page\{[^}]*overflow-y:auto/);
  assert.doesNotMatch(style,/\.page\{[^}]*overflow-y:hidden/);
});
