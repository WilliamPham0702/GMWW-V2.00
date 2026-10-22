import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const sandbox={};
vm.runInNewContext(read('assets/village/village-layout.js'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;

test('GP2 uses one authoritative fire landmark and expanded paved courtyard',()=>{
 assert.equal(layout.scene.id,'gp2-25d');
 assert.equal(layout.fire.x,50);
 assert.equal(layout.fire.y,64);
 assert.equal(layout.inside(layout.fire.x,layout.fire.y),false);
 assert.equal(layout.inside(50,82),true);
 assert.equal(layout.inside(50,17),false);
 assert.equal(layout.inside(3,55),false);
});

test('30 actors have distinct depth-sorted positions without resizing assets',()=>{
 for(const shape of layout.seatTemplateShapes){
  const places=layout.positions(30,shape);
  assert.equal(places.length,30);
  assert.equal(new Set(places.map(p=>p.depth)).size,5);
  assert.equal(new Set(places.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size,30);
  for(const p of places)assert.ok(layout.inside(p.x,p.y));
  for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++)
   assert.ok(Math.hypot(places[i].x-places[j].x,1.78*(places[i].y-places[j].y))>5.2);
  const iphone=places.map(p=>layout.toScreen(p,390,844));
  assert.ok(iphone.every(p=>p.x>2&&p.x<98&&p.y>2&&p.y<98));
 }
 const gmCss=read('server-game/current/style.css');
 assert.match(gmCss,/body\.play-immersive \.play-player-avatar\{width:56px!important;height:74px!important\}/);
});

test('GP2 scene is background-only, matching day/night world geometry and artwork paths',()=>{
 const day=read('assets/backgrounds/gmww-gp2-village-day.svg');
 const night=read('assets/backgrounds/gmww-gp2-village-night.svg');
 for(const svg of [day,night]){
  assert.match(svg,/<svg[^>]*viewBox="0 0 864 1536"/);
  assert.doesNotMatch(svg,/<text\b|<button\b|GMWW|XEM TRƯỚC/i);
  assert.match(svg,/cx="432" cy="983"/);
 }
 const gm=read('server-game/current/style.css'),web=read('assets/village/village-art.css');
 assert.match(gm,/gmww-gp2-village-day\.svg/);
 assert.match(gm,/gmww-gp2-village-night\.svg/);
 assert.match(web,/gmww-gp2-village-day\.svg/);
 assert.match(web,/gmww-gp2-village-night\.svg/);
});

test('GM and Player Web anchor fire to the shared layout and preserve route guard',()=>{
 const gm=read('server-game/current/app.js'),gmSource=read('server-game/src/40-battle-and-timeline.part');
 const web=read('assets/village/village.mjs'),worker=read('src/index.js');
 for(const source of [gm,gmSource])assert.match(source,/playMapDisplay\(anchor\.x,anchor\.y\)/);
 assert.match(web,/screenPoint\(layout\.fire\)/);
 assert.match(web,/gmIdle\?\{x:layout\.fire\.x,y:layout\.fire\.y-7\.5\}/);
 assert.match(worker,/import "\.\.\/assets\/village\/village-layout\.js"/);
 const from=layout.clampPoint(27,43),to=layout.clampPoint(73,83);
 for(let frame=0;frame<=30;frame++){
  const p=layout.interpolate({movementStatus:'moving',moveFromX:from.x,moveFromY:from.y,
   moveToX:to.x,moveToY:to.y,moveStartedAt:1000,moveDurationMs:3000},1000+frame*100);
  assert.ok(layout.inside(p.x,p.y),'walk must avoid fire and outer buildings');
 }
});
