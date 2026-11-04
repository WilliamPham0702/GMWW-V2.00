import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync('server-game/current/GMWW.html','utf8');
const start='/* BEGIN GMWW_PLAYER_SHARE_SCRIPT */';
const end='/* END GMWW_PLAYER_SHARE_SCRIPT */';
const i=html.indexOf(start), j=html.indexOf(end);
assert.ok(i>0&&j>i,'must have link share script inside GMWW.html');
assert.equal(html.indexOf(start,i+1),-1,'must have one link share initializer');
const script=html.slice(i+start.length,j);
const compiled=new Script(script,{filename:'gmww-link-share-inline.js'});

function run(config=null,remembered='legacy',options={}){
  const ids=['gmwwShareLegacy','gmwwShareAlias','gmwwShareAliasLabel','gmwwShareChosenUrl','gmwwShareStatus','gmwwShareCopy','gmwwShareSend'];
  const dom=new Map(ids.map(id=>[id,{
    id,checked:false,disabled:false,textContent:'',listeners:{},
    addEventListener(event,fn){this.listeners[event]=fn;},
  }]));
  const store=new Map([['GMWW_PLAYER_SHARE_LINK_CHOICE_V1',remembered]]);
  const clipboard=[],fallbackCopies=[],shares=[];
  let fallbackNode=null;
  const document={
    getElementById(id){return dom.get(id)||null;},
    body:{appendChild(node){node.appended=true;}},
    createElement(tag){
      assert.equal(tag,'textarea');
      fallbackNode={
        value:'',style:{},removed:false,focused:false,selected:false,range:[],
        setAttribute(){},focus(){this.focused=true;},select(){this.selected=true;},
        setSelectionRange(a,b){this.range=[a,b];},remove(){this.removed=true;},
      };
      return fallbackNode;
    },
    execCommand(command){
      assert.equal(command,'copy');
      if(options.execUnavailable)return false;
      fallbackCopies.push(fallbackNode.value);
      return true;
    },
  };
  const navigator={};
  if(!options.noClipboard){
    navigator.clipboard={writeText:async value=>{
      if(options.clipboardDenied)throw new Error('NotAllowedError');
      clipboard.push(value);
    }};
  }
  if(!options.noShare){
    navigator.share=async data=>{
      if(options.shareAborted)throw Object.assign(new Error('cancelled'),{name:'AbortError'});
      shares.push(data);
    };
  }
  const window={
    GMWW_PLAYER_WEB_ALIAS_CONFIG:config,
    localStorage:{getItem(key){return store.get(key)||null},setItem(key,value){store.set(key,value)}},
  };
  compiled.runInNewContext({document,navigator,window,URL});
  return {dom,store,clipboard,shares,fallbackCopies,getFallbackNode:()=>fallbackNode};
}

test('GM settings exposes only the verified Pages hostname as Link mới; legacy link unchanged',()=>{
  for(const name of ['gmwwPlayerWebShareSettings','gmwwShareLegacy','gmwwShareAlias','gmwwShareCopy','gmwwShareSend']){
    assert.ok(html.includes('id="'+name+'"'),name);
  }
  assert.ok(html.includes('https://gamemasoi.pages.dev/'));
  assert.ok(html.includes('value="alias" disabled'),'initially fail closed until script runs');
  assert.ok(!html.includes('gamemasoi.duckdns.org'),'unregistered domain never published');
  assert.ok(!script.includes('GMWW_PLAYER_WEB_ALIAS_CONFIG'),'must never trust injected external aliases');
});
test('legacy link remains selected by default and old copy/share behavior remains intact',async()=>{
  const h=run();
  const old='https://gmww-v2-00.williampham0702.workers.dev/';
  assert.equal(h.dom.get('gmwwShareAlias').disabled,false);
  assert.equal(h.dom.get('gmwwShareLegacy').checked,true);
  assert.equal(h.dom.get('gmwwShareAliasLabel').textContent,'https://gamemasoi.pages.dev/');
  assert.equal(h.dom.get('gmwwShareChosenUrl').textContent,old);
  await h.dom.get('gmwwShareCopy').listeners.click();
  assert.deepEqual(h.clipboard,[old]);
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.shares[0].url,old);
});
test('Link mới may be selected, copied, sent, and remembered without changing backend',async()=>{
  const alias='https://gamemasoi.pages.dev/';
  const h=run();
  assert.equal(h.dom.get('gmwwShareAlias').disabled,false);
  h.dom.get('gmwwShareLegacy').checked=false;
  h.dom.get('gmwwShareAlias').checked=true;
  h.dom.get('gmwwShareAlias').listeners.change();
  assert.equal(h.dom.get('gmwwShareChosenUrl').textContent,alias);
  assert.equal(h.store.get('GMWW_PLAYER_SHARE_LINK_CHOICE_V1'),'alias');
  await h.dom.get('gmwwShareCopy').listeners.click();
  assert.deepEqual(h.clipboard,[alias]);
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.shares[0].url,alias);
  assert.ok(!script.includes('fetch(')&&!script.includes('/api/gm/'),'share picker cannot change game data');
  assert.equal(run(null,'alias').dom.get('gmwwShareAlias').checked,true);
  assert.equal(run(null,'alias').dom.get('gmwwShareChosenUrl').textContent,alias);
});
test('unverified or malicious injected alias cannot replace the approved fixed Pages hostname',async()=>{
  const approved='https://gamemasoi.pages.dev/';
  for(const config of [
    {verified:false,url:'https://gamemasoi.pages.dev/'},
    {verified:true,url:'https://unowned.example.org/'},
    {verified:true,url:'http://gamemasoi.pages.dev/'},
    {verified:true,url:'javascript:alert(1)'},
    {verified:true,url:'https://gmww-v2-00.williampham0702.workers.dev/'}
  ]){
    const h=run(config,'alias');
    assert.equal(h.dom.get('gmwwShareAlias').disabled,false);
    assert.equal(h.dom.get('gmwwShareChosenUrl').textContent,approved);
    await h.dom.get('gmwwShareSend').listeners.click();
    assert.equal(h.shares[0].url,approved);
  }
});

test('iPhone clipboard denial falls back to focus/selection and removes temporary textarea',async()=>{
  const h=run(null,'legacy',{clipboardDenied:true});
  const old='https://gmww-v2-00.williampham0702.workers.dev/';
  await h.dom.get('gmwwShareCopy').listeners.click();
  assert.deepEqual(h.clipboard,[]);
  assert.deepEqual(h.fallbackCopies,[old]);
  const el=h.getFallbackNode();
  assert.equal(el.focused,true);
  assert.equal(el.selected,true);
  assert.deepEqual(el.range,[0,old.length]);
  assert.equal(el.removed,true);
  assert.equal(h.dom.get('gmwwShareStatus').textContent,'Đã sao chép link Player Web.');
});

test('clipboard absent, Web Share unavailable and fallback copy failure are handled safely',async()=>{
  const h=run(null,'legacy',{noClipboard:true,noShare:true});
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.fallbackCopies.length,1);
  assert.equal(h.shares.length,0);
  const failed=run(null,'legacy',{noClipboard:true,noShare:true,execUnavailable:true});
  await failed.dom.get('gmwwShareCopy').listeners.click();
  assert.ok(failed.dom.get('gmwwShareStatus').textContent.includes('Không thể sao chép'));
  assert.equal(failed.getFallbackNode().removed,true,'always remove fallback textarea');
});

test('canceling the iPhone share sheet does not report a failure or modify choice',async()=>{
  const h=run(null,'legacy',{shareAborted:true});
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.dom.get('gmwwShareStatus').textContent,'Đang dùng link Cloudflare hiện tại.');
  assert.equal(h.store.get('GMWW_PLAYER_SHARE_LINK_CHOICE_V1'),'legacy');
});

test('WebKit mobile viewport: actual UI layout, selection, copy and share', {skip:process.env.GMWW_RUN_MOBILE_WEBKIT!=='1'}, async()=>{
  const {webkit}=await import('playwright');
  const uiStart='<!-- BEGIN GMWW_PLAYER_SHARE_UI -->';
  const uiEnd='<!-- END GMWW_PLAYER_SHARE_UI -->';
  const styleStart='<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->';
  const styleEnd='<!-- END GMWW_PLAYER_SHARE_STYLE -->';
  const ui=html.slice(html.indexOf(uiStart)+uiStart.length,html.indexOf(uiEnd));
  const css=html.slice(html.indexOf(styleStart)+styleStart.length,html.indexOf(styleEnd));
  assert.ok(ui.includes('gmwwShareLegacy') && css.includes('#gmwwPlayerWebShareSettings'));
  const head='<meta name="viewport" content="width=device-width,initial-scale=1">'+css;
  const harness='<script>window.__copied=[];window.__shared=[];'+
    'Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async value=>window.__copied.push(value)}});'+
    'Object.defineProperty(navigator,"share",{configurable:true,value:async data=>window.__shared.push(data)});</script>';
  const browser=await webkit.launch({headless:true});
  try{
    for(const width of [375,390,430]){
      const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
      const page=await ctx.newPage();
      await page.setContent('<!doctype html><html lang="vi"><head>'+head+'</head><body>'+
        ui+harness+'<script>'+script+'</script></body></html>');
      assert.equal(await page.locator('#gmwwShareLegacy').isChecked(),true);
      assert.equal(await page.locator('#gmwwShareAlias').isEnabled(),true);
      assert.equal(await page.locator('#gmwwShareAliasLabel').innerText(),'https://gamemasoi.pages.dev/');
      assert.equal(await page.locator('#gmwwShareChosenUrl').innerText(),
        'https://gmww-v2-00.williampham0702.workers.dev/');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),
        true,'GM share card overflows '+width+'px');
      await page.locator('#gmwwShareCopy').click();
      assert.deepEqual(await page.evaluate(()=>window.__copied),
        ['https://gmww-v2-00.williampham0702.workers.dev/']);
      await page.locator('#gmwwShareSend').click();
      assert.equal((await page.evaluate(()=>window.__shared))[0].url,
        'https://gmww-v2-00.williampham0702.workers.dev/');
      await page.locator('#gmwwShareAlias').check();
      assert.equal(await page.locator('#gmwwShareChosenUrl').innerText(),'https://gamemasoi.pages.dev/');
      await page.locator('#gmwwShareCopy').click();
      await page.locator('#gmwwShareSend').click();
      assert.equal((await page.evaluate(()=>window.__copied)).at(-1),'https://gamemasoi.pages.dev/');
      assert.equal((await page.evaluate(()=>window.__shared)).at(-1).url,'https://gamemasoi.pages.dev/');
      await ctx.close();
    }
  }finally{
    await browser.close();
  }
});

test('PR682 CI remains exact-scope and fails closed for extra Worker/gameplay files',async()=>{
  const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  assert.equal(classifyBrowserScope([{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope([{path:'server-game/current/GMWW.html',status:'M'}]),'full');
});
