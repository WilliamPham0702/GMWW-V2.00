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

test('GM settings renders old and new link choices but never invents a free domain',()=>{
  for(const name of ['gmwwPlayerWebShareSettings','gmwwShareLegacy','gmwwShareAlias','gmwwShareCopy','gmwwShareSend']){
    assert.ok(html.includes('id="'+name+'"'),name);
  }
  assert.ok(html.includes('value="alias" disabled'));
  assert.ok(!html.includes('gamemasoi.duckdns.org'),'unregistered free domain must not be a user-facing URL');
});

test('without verified DNS/HTTPS alias, old Cloudflare URL remains selected and shareable',async()=>{
  const h=run();
  const old='https://gmww-v2-00.williampham0702.workers.dev/';
  assert.equal(h.dom.get('gmwwShareAlias').disabled,true);
  assert.equal(h.dom.get('gmwwShareLegacy').checked,true);
  assert.equal(h.dom.get('gmwwShareChosenUrl').textContent,old);
  await h.dom.get('gmwwShareCopy').listeners.click();
  assert.deepEqual(h.clipboard,[old]);
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.shares[0].url,old);
});

test('verified HTTPS alias can be selected, remembered and shared without switching the game backend',async()=>{
  const alias='https://gamemasoi.example.org/';
  const h=run({verified:true,url:alias});
  assert.equal(h.dom.get('gmwwShareAlias').disabled,false);
  assert.equal(h.dom.get('gmwwShareLegacy').checked,true);
  h.dom.get('gmwwShareLegacy').checked=false;
  h.dom.get('gmwwShareAlias').checked=true;
  h.dom.get('gmwwShareAlias').listeners.change();
  assert.equal(h.dom.get('gmwwShareChosenUrl').textContent,alias);
  assert.equal(h.store.get('GMWW_PLAYER_SHARE_LINK_CHOICE_V1'),'alias');
  await h.dom.get('gmwwShareSend').listeners.click();
  assert.equal(h.shares[0].url,alias);
  assert.ok(!script.includes('fetch(')&&!script.includes('/api/gm/'),'link picker must not change backend or game data');
  assert.equal(run({verified:true,url:alias},'alias').dom.get('gmwwShareAlias').checked,true);
});

test('invalid/non-HTTPS/same-origin aliases are disabled even if a config says verified',()=>{
  for(const url of ['http://gamemasoi.example.org/','https://gmww-v2-00.williampham0702.workers.dev/','https://bad.example.org/some-path','javascript:alert(1)','https://user:password@bad.example.org/']){
    const h=run({verified:true,url},'alias');
    assert.equal(h.dom.get('gmwwShareAlias').disabled,true,url);
    assert.equal(h.dom.get('gmwwShareLegacy').checked,true,url);
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
