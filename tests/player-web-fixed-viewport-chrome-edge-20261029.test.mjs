import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

const boot=readFileSync('src/player-web-src/00-bootstrap-and-session.part','utf8');
const village=readFileSync('assets/village/village.css','utf8');
const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');

test('Player Web uses visible viewport on Safari, Chrome and Edge iOS, not a scrolling document',()=>{
  assert.match(boot,/installGmwwPlayerViewport/);
  assert.match(boot,/const \$=\(s,r=document\).*\$\$=\(s,r=document\)/,'keep both DOM selector helpers intact');
  assert.match(boot,/window\.visualViewport/);
  assert.match(boot,/visualViewport\.addEventListener\('resize'/);
  assert.match(boot,/visualViewport\.addEventListener\('scroll'/);
  assert.match(boot,/orientationchange/);
  assert.match(boot,/--gmww-player-visible-height/);
  assert.match(boot,/body\{position:fixed!important;inset:0!important/);
  assert.match(boot,/html body #game\.screen\.active\{position:fixed!important/);
  assert.match(boot,/html body #gmwwVillageShell\{position:fixed!important/);
  assert.match(gmwwMembersLiveScript,/installGmwwPlayerViewport/,'The shipping script must install the viewport fix');
  assert.match(gmwwMembersLiveScript,/window\.visualViewport/,'The compiled script must track the actual visible viewport');
});
test('Embedded village fills its iframe exactly, without taller mobile vh units',()=>{
  assert.match(village,/html\.embedded \.game\{[^}]*height:100%;min-height:0!important/);
  assert.match(village,/html\.embedded \.stage\{[^}]*height:100%!important;min-height:0!important/);
  assert.doesNotMatch(village,/html\.embedded \.stage\{[^}]*100svh/);
});
test('Chat remains inside visible viewport during keyboard input; messages alone scroll',()=>{
  assert.match(boot,/#gmwwChatPanel\{[^']*gmww-player-visible-height/);
  assert.match(boot,/#gmwwChatPanel\{[^']*translateY\(-100%\)/);
  assert.match(boot,/#gmwwChatLines\{min-height:0!important;overflow-y:auto!important/);
  assert.match(boot,/#gmwwChatText\{font-size:16px!important/);
  assert.match(chat,/function gmwwChatClosePanel\(/);
  assert.match(chat,/const panel=document\.getElementById\('gmwwChatPanel'\);if\(panel\?\.contains\(event\.target\)\)return/);
  assert.match(boot,/#gmwwOnlineDock\{[^']*gmww-player-visible-height/);
  assert.match(boot,/#gmwwChatLaunch\{[^']*gmww-player-visible-height/);
});

test('Visible viewport tracks iPhone keyboard and browser chrome resizes',()=>{
  const a=boot.indexOf('(function installGmwwPlayerViewport(){'),b=boot.indexOf('\n})();',a);
  assert.ok(a>=0&&b>a);
  const vars=new Map(),styles=[],windowHandlers={},viewportHandlers={};
  const document={
    getElementById:()=>null,
    createElement:()=>({id:'',textContent:''}),
    head:{appendChild:s=>styles.push(s.textContent)},
    documentElement:{clientHeight:900,style:{setProperty:(k,v)=>vars.set(k,v)}},
    addEventListener:(k,fn)=>{windowHandlers[k]=fn}
  };
  const visualViewport={height:600,offsetTop:0,addEventListener:(k,fn)=>{viewportHandlers[k]=fn}};
  const window={visualViewport,innerHeight:900,addEventListener:(k,fn)=>{windowHandlers[k]=fn}};
  runInNewContext(boot.slice(a,b+6),{document,window,requestAnimationFrame:fn=>fn()});
  assert.equal(vars.get('--gmww-player-visible-height'),'600px');
  assert.match(styles.join(''),/body\{position:fixed!important;inset:0!important/);
  assert.match(styles.join(''),/#gmwwChatLines\{min-height:0!important;overflow-y:auto!important/);
  visualViewport.height=337;visualViewport.offsetTop=38;viewportHandlers.resize();
  assert.equal(vars.get('--gmww-player-visible-height'),'337px');
  assert.equal(vars.get('--gmww-player-visible-top'),'38px');
  visualViewport.height=667;visualViewport.offsetTop=0;viewportHandlers.scroll();
  assert.equal(vars.get('--gmww-player-visible-height'),'667px');
  assert.equal(vars.get('--gmww-player-visible-top'),'0px');
});
test('Village CSS uses a new browser cache key for PR631',()=>{
  assert.match(readFileSync('assets/village/index.html','utf8'),/village\.css\?v=3202-viewport631&amp;/);
});
