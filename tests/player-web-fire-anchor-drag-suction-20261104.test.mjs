import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript as live} from '../src/gmww-members-live.js';

const village=readFileSync('assets/village/village.mjs','utf8');
const sceneManager=readFileSync('assets/village/scene-manager.mjs','utf8');
const fn=(src,name)=>{const i=src.indexOf('function '+name+'(');assert.ok(i>=0,name+' missing');return src.slice(i,src.indexOf('\n',i))};

// Bug: Player Web placed action icons at the GP2 landmark (50,64) instead of the GM's published fire marker.
test('Player Web fire uses the published fire marker, same rule as GM Server',()=>{
  assert.match(sceneManager,/globalThis\.GMWW_VILLAGE_FIRE_ANCHORS=fires/);
  assert.match(sceneManager,/new Event\('gmww:village-fire-anchor'\)/);
  const make=new Function('layout','screenPoint','night',fn(village,'fireScreenPoint')+'\nreturn fireScreenPoint;');
  const layout={fire:{x:50,y:64}},sp=p=>({x:p.x,y:p.y});
  globalThis.GMWW_VILLAGE_FIRE_ANCHORS={night:{x:47.5,y:52},day:{x:30,y:70}};
  globalThis.GMWW_VILLAGE_SCENE_IMAGES={day:true,night:true};
  assert.deepEqual(make(layout,sp,true)(),{x:47.5,y:52});
  assert.deepEqual(make(layout,sp,false)(),{x:30,y:70});
  globalThis.GMWW_VILLAGE_FIRE_ANCHORS={};
  assert.deepEqual(make(layout,sp,true)(),{x:50,y:50},'imported image without marker → centre (GM rule)');
  globalThis.GMWW_VILLAGE_SCENE_IMAGES={};
  assert.deepEqual(make(layout,sp,true)(),{x:50,y:64},'no custom scene → GP2 landmark');
  assert.doesNotMatch(village,/fire\.style\.left=point\.x\+'%'/,'old landmark-only placement removed');
  assert.match(village,/addEventListener\('gmww:village-fire-anchor',placeFire\)/);
});

test('dragging lifts the real icon, magnet-sucks into a nearby player, misses fly home',()=>{
  const down=live.slice(live.indexOf('function gmwwOnlineIconDown'),live.indexOf('function gmwwOnlineTurnEffects'));
  assert.match(down,/node\.classList\?\.add\('gmww-online-lifted'\)/,'original icon must leave the fire while dragging');
  // V3.301: suction centre now comes from the per-frame cached snapshot (hit.cx/cy), not a live iframe read per move.
  assert.match(down,/c=hit\?\{x:hit\.cx,y:hit\.cy\}:null/);
  assert.match(down,/ghost\.classList\?\.toggle\('is-magnet',!!c\)/);
  assert.match(down,/finished=true;cleanup\(\);settle\(\)/,'blur/cancel puts the icon back on the fire');
  assert.match(down,/gmwwOnlineFlyGhost\(ghost,c,true\)/,'drop → absorb animation into player');
  assert.match(down,/gmwwOnlineFlyGhost\(ghost,\{x:home\.left/,'miss → fly back to campfire');
  assert.match(down,/gmwwOnlineTarget\(target\)/,'server authorization path unchanged');
  assert.match(live,/#gmwwOnlineDock button\.gmww-online-lifted\{opacity:0!important/);
  assert.match(live,/\.gmww-online-ghost\.is-magnet\{/);
});

test('restore button is labelled and pulses when an action can be restored',()=>{
  assert.match(live,/undo\.id='gmwwPlayerRestore';undo\.textContent='Khôi phục'/);
  const hint=new Function('document','state','gmwwOnlinePick','gmwwOnlineCanRestore',
    live.slice(live.indexOf('function gmwwOnlineRestoreHint'),live.indexOf('function gmwwOnlinePickAction'))+'\nreturn gmwwOnlineRestoreHint;');
  const cls=new Set(),b={classList:{toggle:(k,on)=>on?cls.add(k):cls.delete(k)},title:''},doc={getElementById:()=>b};
  hint(doc,{room:{phase:'running',cyclePhase:'night'}},null,true)();assert.ok(cls.has('gmww-restore-ready'));
  hint(doc,{room:{phase:'running',cyclePhase:'day'}},null,true)();assert.ok(!cls.has('gmww-restore-ready'));
  hint(doc,{room:{phase:'running',cyclePhase:'day'}},{action:{}},false)();assert.ok(cls.has('gmww-restore-ready'),'pending pick can be cancelled');
  assert.match(live,/@keyframes gmwwRestorePulse/);
});
