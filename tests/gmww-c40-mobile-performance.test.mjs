import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const repoRoot = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, repoRoot),'utf8');

test('GM Character-40 canvas is never painted with the legacy cyan avatar span background',()=>{
  const css=read('server-game/current/style.css');
  assert.match(css, /\.play-player-avatar > span\.gmww40-character\s*\{[^}]*background:transparent!important/s);
  const gmHtml=read('server-game/current/GMWW.html');
  assert.match(gmHtml, /style\.css\?v=3\.156-c40-cyan-fix/);
});

test('GM and Player Web share the same mobile-optimized four-motion renderer',()=>{
  const player=read('assets/characters/gmww40/runtime.js');
  const gm=read('server-game/current/gmww-shared-motion.js');
  assert.equal(gm,player);
  assert.match(player,/const ACTIONS=Object\.freeze\(\['idle','walk','run','turn'\]\)/);
  assert.match(player,/if\(root\._gmwwDrawKey===drawKey\)return/);
});

test('idle Canvas frames do not repaint repeatedly, and hidden pages suspend animation',()=>{
  const code=read('assets/characters/gmww40/runtime.js');
  const draws=[];
  const frames=new Map(),listeners=new Map();
  let nextFrameId=0;
  const context={clearRect(){},drawImage(...args){draws.push(args)}};
  const createElement=tag=>{
    const element={
      tagName:tag.toUpperCase(),dataset:{},style:{},children:[],isConnected:true,
      append(...children){this.children.push(...children)},
      setAttribute(){},closest(){return null},
      get firstElementChild(){return this.children[0]||null}
    };
    if(tag==='canvas')element.getContext=()=>context;
    return element;
  };
  const document={
    hidden:false,createElement,
    addEventListener(name,handler){listeners.set(name,handler)}
  };
  class ImageStub{constructor(){this.complete=true;this.naturalWidth=1448;this.src='';}}
  const sandbox={
    document,Image:ImageStub,
    requestAnimationFrame(callback){const id=++nextFrameId;frames.set(id,callback);return id},
    cancelAnimationFrame(id){frames.delete(id)}
  };
  sandbox.globalThis=sandbox;
  runInNewContext(code,sandbox,{timeout:5000});
  const host={
    element:null,replaceChildren(){this.element=null},
    append(node){this.element=node},
    querySelector(selector){return selector==='[data-character-renderer="gmww40-atlas"]'?this.element:null}
  };
  const controller=sandbox.GMWW_SHARED_MOTION;
  assert.deepEqual(Array.from(controller.actions),['idle','walk','run','turn']);
  controller.mount(host,{characterId:'character-01',assetBase:'',command:{state:'idle',motion:'idle',facing:'right'}});
  assert.equal(draws.length,1);
  const step=time=>{
    const item=frames.entries().next().value;
    assert.ok(item,'animation callback must remain scheduled');
    frames.delete(item[0]);item[1](time);
  };
  for(let t=1;t<=160;t+=16)step(t);
  assert.equal(draws.length,1,'unchanged idle image should not redraw at screen refresh rate');
  document.hidden=true;listeners.get('visibilitychange')();
  assert.equal(frames.size,0,'background page must stop scheduling frames');
  document.hidden=false;listeners.get('visibilitychange')();
  assert.equal(frames.size,1,'foreground page should resume animation');
  controller.update(host,{characterId:'character-01',state:'walking',motion:'walk',facing:'right'});
  step(210);
  assert.ok(draws.length>=2,'walking should render a new frame');
});

test('Player Web roaming avoids 30-second seated pauses and packaged source drift',()=>{
  const parts=[
    '00-bootstrap-and-session.part','10-role-card-artwork.part',
    '20-village-and-profile.part','30-rooms-and-realtime.part',
    '40-cards-and-game.part','50-privacy-and-runtime.part'
  ].map(name=>read('src/player-web-src/'+name)).join('');
  const bundled=read('src/gmww-members-live.js');
  assert.equal(bundled,'export const gmwwMembersLiveScript = '+JSON.stringify(parts)+';\n');
  assert.match(parts,/const LOBBY_MOTION_HOLD_MS=1400;/);
  assert.doesNotMatch(parts,/ngồi 30 giây/);
  assert.doesNotMatch(parts,/autoMotionPhase:state\.lobbyMotionPhase==='gather'\?'gather':'roam'/);
});
