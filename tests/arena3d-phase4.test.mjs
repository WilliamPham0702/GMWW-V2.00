import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {createArenaCharacterField,atelierPalette,ARENA_ATELIER_VERSION} from '../assets/village/arena-3d/character-atelier.mjs';
import {publicGMRows,publicVoteSummary,publicPhaseName} from '../assets/village/arena-3d/gm-dashboard.mjs';

test('Phase4 art: 40 character IDs yield forty color + hairstyle/accessory combinations',()=>{
  const styles=Array.from({length:40},(_,i)=>atelierPalette('character-'+String(i+1).padStart(2,'0')));
  assert.equal(new Set(styles.map(x=>JSON.stringify(x))).size,40);
  assert.deepEqual([...new Set(styles.map(x=>x.style))].sort((a,b)=>a-b),[0,1,2,3,4]);
  assert.equal(ARENA_ATELIER_VERSION,'arena-chibi-instanced-v5-casting');
});
test('Phase4: 30 actors remain InstancedMesh with fixed draw calls despite 40 styles',()=>{
  const scene=new THREE.Scene(),atlas=createArenaCharacterField(THREE,scene);
  const actors=Array.from({length:30},(_,i)=>({id:'member:p'+i,seatId:i+1,characterId:'character-'+String(i+1).padStart(2,'0'),
    position:{x:Math.cos(i)*3,z:Math.sin(i)*3},statusTags:[]}));
  atlas.setActors(actors);assert.equal(atlas.actorCount,30);assert.ok(atlas.drawBudget<=45);
  assert.equal(atlas.performGesture('member:p0','wave'),true);
  assert.equal(atlas.performGesture('member:p1','cheer'),true);
  assert.equal(atlas.performGesture('member:p2','nod'),true);
  assert.equal(atlas.performGesture('member:p2','turn'),true);
  assert.equal(atlas.performGesture('member:fake','wave'),false);
  assert.equal(atlas.performGesture('member:p1','private-role-action'),false);
  atlas.draw(performance.now()+100,true);atlas.setReducedMotion(true);atlas.draw(performance.now()+400,true);
  assert.equal(atlas.actorCount,30);atlas.dispose();
});
test('Phase4 GM console: only already-public seat, status and permitted vote totals are shown',()=>{
  const frame={room:{code:'ABCD',phase:'running',cyclePhase:'night',cycleNight:3,seatCount:12},
    players:[
      {id:'member:b',kind:'player',seatId:2,displayName:'B',online:true,ready:true,
        roleName:'Sói',gmToken:'secret',privateCard:{role:'Wolf'},
        statusTags:[{statusId:'protected',label:'Bảo vệ'}]},
      {id:'member:a',kind:'player',seatId:1,displayName:'A',online:false,ready:false,statusTags:[]},
      {id:'gm',kind:'gm',seatId:null,displayName:'GM'}
    ]};
  const list=publicGMRows(frame);assert.deepEqual(list.map(x=>x.seatId),[1,2]);
  const output=JSON.stringify(list);
  for(const str of ['Sói','secret','privateCard','Wolf','gmToken'])assert.equal(output.includes(str),false);
  assert.equal(publicPhaseName(frame.room),'ĐÊM 3');
  assert.equal(publicPhaseName({phase:'running',cyclePhase:'morning',cycleNight:2}),'NGÀY 2');
  assert.equal(publicPhaseName({phase:'role_delivery'}),'Đã Phát Vai');
  assert.match(publicVoteSummary({stage:'voting',save:5,kill:4,outcome:'alive'}),/👍 5 \/ 👎 4/);
  assert.ok(!publicVoteSummary({stage:'voting',save:5,kill:4,individualVoters:['topsecret']}).includes('topsecret'));
});
test('Phase4 UI stays staging-only; GM token never stored or passed via URL',()=>{
  const html=readFileSync('assets/village/arena-3d/live.html','utf8');
  const js=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const panel=readFileSync('assets/village/arena-3d/gm-dashboard.mjs','utf8');
  const ci=readFileSync('.github/workflows/deploy-arena3d-core-stage.yml','utf8');
  for(const name of ['gm-console','gm-restore','gm-key','gm-copy'])assert.ok(html.includes('id="'+name+'"'));
  assert.match(js,/createGmDashboard/);
  assert.match(js,/chosenCandidate/);
  assert.match(js,/authorization:'Bearer '\+candidate/);
  assert.match(js,/lowPower/);
  assert.match(panel,/textContent/);
  assert.doesNotMatch(panel,/\.innerHTML|eval\(|Function\(/);
  assert.doesNotMatch(js,/localStorage|sessionStorage|searchParams\.set\('gmToken'/);
  assert.match(ci,/arena3d-phase4\.test\.mjs/);
  assert.match(ci,/name: Deploy Arena 3D Core V2 STAGING/);
});
