// Verify that ONLY the exact audited GM/iframe bridge is routed to Arena 3D
// focused gates. Any mutation of 2D/Core, role rules or a new token path => full.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const read=p=>readFileSync(p,'utf8');
const app=read('server-game/current/app.js'),
      part=read('server-game/src/20-members-and-roster.part'),
      portal=read('server-game/current/GMWW.html');
const diff=(path,before,after)=>({path,status:'M',before,after});
const add=path=>({path,status:'A',before:null,after:'approved Arena 3D file'});
function stripBridge(s){
 const i=s.indexOf('const GMWW_ARENA_OFFICIAL_ORIGIN='),
  j=s.indexOf('\nfunction playLiveMembers()',i);
 assert.ok(i>0&&j>i);
 return s.slice(0,i).replace(/\n$/,'')+s.slice(j);
}
function restoreLegacyPortal(s){
 const approvedStart=s.indexOf('/* Official Arena 3D'),approvedEnd=s.indexOf('</script>',approvedStart);
 assert.ok(approvedStart>0&&approvedEnd>approvedStart);
 s=s.slice(0,approvedStart)+"/* This Runtime-only experiment keeps the 2D menu/game untouched.\n * WebKit handles HTTPS inside subframes; its main-frame external navigation would open Safari.\n * This on-demand iframe stays on independent STAGING Worker/DO (not Production rooms). */\n(function(){\n  'use strict';\n  const arenaUrl='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html';\n  const button=document.getElementById('gmwwHomeEnterVillage');\n  if(!button)return;\n  let overlay=null,frame=null,lastFocus=null,originalOverflow='';\n  function closeArena(go2d){\n    if(!overlay||overlay.hidden)return;\n    overlay.hidden=true;\n    if(frame)frame.src='about:blank'; // unload 3D GPU scene/audio when leaving\n    document.body.style.overflow=originalOverflow;\n    if(go2d){\n      document.querySelector('#bottomNav .nav[data-page=\"start\"]')?.click();\n    }else{\n      lastFocus?.focus?.();\n    }\n  }\n  function create(){\n    overlay=document.createElement('section');\n    overlay.id='gmwwArena3dQaPortal';\n    overlay.hidden=true;\n    overlay.setAttribute('role','dialog');\n    overlay.setAttribute('aria-modal','true');\n    overlay.setAttribute('aria-label','Thử nghiệm Arena 3D · STAGING');\n    const bar=document.createElement('div');bar.className='gmww-arena-qa-bar';\n    const title=document.createElement('strong');title.textContent='🌊 ARENA 3D · STAGING';\n    const back=document.createElement('button');back.type='button';back.textContent='‹ Trang Chủ';\n    back.id='gmwwArena3dQaClose';back.addEventListener('click',()=>closeArena(false));\n    const to2d=document.createElement('button');to2d.type='button';to2d.textContent='Chơi 2D';\n    to2d.id='gmwwArena3dQa2d';to2d.addEventListener('click',()=>closeArena(true));\n    bar.append(back,title,to2d);\n    frame=document.createElement('iframe');frame.id='gmwwArena3dQaFrame';\n    frame.title='Arena 3D STAGING — chỉ phòng thử nghiệm';\n    frame.setAttribute('referrerpolicy','no-referrer');\n    frame.setAttribute('allow','fullscreen; autoplay');\n    overlay.append(bar,frame);\n    document.body.appendChild(overlay);\n  }\n  function openArena(){\n    if(!overlay)create();\n    lastFocus=document.activeElement;\n    originalOverflow=document.body.style.overflow;\n    document.body.style.overflow='hidden';\n    overlay.hidden=false;\n    frame.src=arenaUrl;\n    document.getElementById('gmwwArena3dQaClose')?.focus();\n  }\n  // Capture BEFORE app.js's target-level legacy \"Vào Làng => Trang Chơi\" handler.\n  document.addEventListener('click',function(event){\n    if(!event.target?.closest?.('#gmwwHomeEnterVillage'))return;\n    event.preventDefault();\n    event.stopPropagation();\n    event.stopImmediatePropagation();\n    openArena();\n  },true);\n  document.addEventListener('keydown',event=>{\n    if(event.key==='Escape'&&overlay&&!overlay.hidden)closeArena(false);\n  });\n})();\n"+s.slice(approvedEnd);
 for(const [modern,old] of [
   ['aria-label="Vào Làng Arena 3D chính thức"','aria-label="Vào Làng và thử nghiệm Arena 3D STAGING"'],
   ['<small>CHƠI ARENA 3D</small>','<small>THỬ NGHIỆM ARENA 3D</small>']
 ]){
   assert.equal(s.split(modern).length,2);
   s=s.replace(modern,()=>old);
 }
 return s;
}
function changes(){
 return [
   diff('server-game/current/app.js',stripBridge(app),app),
   diff('server-game/src/20-members-and-roster.part',stripBridge(part),part),
   diff('server-game/current/GMWW.html',restoreLegacyPortal(portal),portal),
   add('assets/village/arena-3d/live.mjs'),
   add('tests/arena3d-portal-handoff.test.mjs'),
   add('tests/arena3d-room-adoption.test.mjs')
 ];
}
test('Exact approved Arena 3D portal + GM Core handoff uses scoped related tests',()=>{
 assert.equal(classifyBrowserScope(changes()),'arena3d-official');
});
test('Mutated Core/gameplay and unauthorized extra fields fail closed to full suite',()=>{
 for(const x of [
   diff('src/index.js','previous Core','altered Core'),
   diff('src/gmww-gallows-rules.js','previous gallows','altered rules'),
   diff('server-game/src/40-battle-and-timeline.part','previous timeline','altered game')
 ]){
  assert.equal(classifyBrowserScope([...changes(),x]),'full',x.path);
 }
});
test('Tampered GM token bridge, wrong portal host or missing authorization test fail closed',()=>{
 const base=changes();
 const appRow=base.find(x=>x.path==='server-game/current/app.js');
 const portalRow=base.find(x=>x.path==='server-game/current/GMWW.html');
 assert.equal(classifyBrowserScope(base.map(x=>x===appRow?{...x,after:x.after+'\\n// unsafe extra code'}:x)),'full');
 assert.equal(classifyBrowserScope(base.map(x=>x===appRow?{...x,after:x.after.replace(
   'gmww-arena3d-adopt-room','gmww-arena3d-adopt-room-unsafe')}:x)),'full');
 assert.equal(classifyBrowserScope(base.map(x=>x===portalRow?{...x,after:x.after.replace(
   'https://gmww-v2-00.williampham0702.workers.dev/village/arena-3d/live.html',
   'https://evil.example/arena.html')}:x)),'full');
 assert.equal(classifyBrowserScope(base.filter(x=>x.path!=='tests/arena3d-room-adoption.test.mjs')),'full');
});
