import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {webkit}=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
 ?createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runner.js')('playwright')
 :require('playwright');

const browser=await webkit.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 const image='url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%2388cba7\'/%3E%3C/svg%3E")';
 await page.setContent('<!doctype html><main class="game day" id="game"><section class="stage custom-scene" style="width:390px;height:844px"><div class="scene" id="scene"><div class="plaza"></div><button class="fire" aria-label="Đống lửa"></button><div class="players" id="players"></div></div></section></main>');
 // The source CSS starts with a relative @import. On Playwright's about:blank
 // document that import has no resolvable base URL and rejects addStyleTag.
 // Inject exactly the layout rules under test; status effects are unrelated here.
 const css=fs.readFileSync('assets/village/village.css','utf8').replace(/^@import[^;]*;/,'');
 await page.addStyleTag({content:css});
 await page.addStyleTag({content:fs.readFileSync('assets/village/village-art.css','utf8')});
 for(const night of [false,true]){
  const result=await page.evaluate(({night,image})=>{
   const game=document.querySelector('#game'),stage=document.querySelector('.stage'),scene=document.querySelector('#scene'),players=document.querySelector('#players');
   game.classList.toggle('night',night);
   stage.style.setProperty('--gmww-scene-image',image);
   players.replaceChildren();
   const create=(x,y,i)=>{
    const el=document.createElement('button');el.type='button';el.className='player';
    el.style.left=x+'%';el.style.top=y+'%';el.innerHTML='<span class="portrait game-character">👤</span><span class="name">P'+i+'</span>';
    players.append(el);return el;
   };
   const center=create(25,55,1),centerBox=center.getBoundingClientRect();
   const hit=document.elementFromPoint(centerBox.left+centerBox.width/2,centerBox.top+centerBox.height/2);
   const hitCenter=hit===center||center.contains(hit);
   for(let i=1;i<30;i++)create(17+(i%5)*16,20+Math.floor(i/5)*10,i+1);
   const stageBox=stage.getBoundingClientRect(),sceneBox=scene.getBoundingClientRect();
   const actorBoxes=[...players.children].map(el=>el.getBoundingClientRect());
   return {position:getComputedStyle(scene).position,stageW:stageBox.width,stageH:stageBox.height,
    sceneW:sceneBox.width,sceneH:sceneBox.height,actors:players.children.length,
    inside:actorBoxes.every(b=>b.width>0&&b.height>0&&b.top<stageBox.bottom&&b.bottom>stageBox.top),
    hitCenter,baseImage:getComputedStyle(stage).backgroundImage,
    overlayImage:getComputedStyle(stage,'::before').backgroundImage,
    imageLayer:getComputedStyle(stage,'::after').backgroundImage};
  },{night,image});
  assert.equal(result.position,'absolute','published background must not make .scene relative');
  assert.ok(Math.abs(result.stageW-result.sceneW)<=1&&Math.abs(result.stageH-result.sceneH)<=1,'camera must fill game stage');
  assert.equal(result.actors,30);
  assert.ok(result.inside,'all 30 Character placeholders remain within viewport');
  assert.ok(result.hitCenter,'character should be tappable above the scene image');
  assert.equal(result.baseImage,'none','original CSS image must be replaced');
  assert.ok(!result.overlayImage.includes('data:image/svg'),'no second image over players');
  assert.ok(result.imageLayer.includes('data:image/svg'),'published image belongs only to ::after');
  await page.screenshot({path:night?'/tmp/gmww-v3181-scene-layer-night.png':'/tmp/gmww-v3181-scene-layer-day.png'});
 }
 await page.setContent('<!doctype html><body class="play-immersive"><main id="start"><div id="playWorld" class="play-world has-custom-scene" style="width:390px;height:844px"><div id="playPlayerRing" class="play-player-ring"><button class="play-player-token" style="left:50%;top:55%"><div class="play-player-avatar">👤</div></button></div></div></main>');
 await page.addStyleTag({path:'server-game/current/style.css'});
 const gm=await page.evaluate(image=>{
  const world=document.getElementById('playWorld');world.style.setProperty('--gmww-gm-scene-image',image);
  const ring=document.getElementById('playPlayerRing'),actor=ring.firstElementChild,bb=actor.getBoundingClientRect();
  const hit=document.elementFromPoint(bb.left+bb.width/2,bb.top+bb.height/2);
  return {position:getComputedStyle(ring).position,zIndex:getComputedStyle(ring).zIndex,
    camera:world.getBoundingClientRect().height,ringHeight:ring.getBoundingClientRect().height,
    hit:actor===hit||actor.contains(hit),background:getComputedStyle(world).backgroundImage};
 },image);
 assert.equal(gm.position,'absolute');
 assert.equal(gm.zIndex,'3');
 assert.ok(Math.abs(gm.camera-gm.ringHeight)<=1);
 assert.ok(gm.hit,'GM Character remains tappable above new background');
 assert.ok(gm.background.includes('data:image/svg'));
 console.log('PASS: iPhone-sized WebKit custom Day/Night scenes + 30 Player placeholders and GM ring');
} finally {await browser.close()}
