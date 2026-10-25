import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const read=path=>readFileSync(path,'utf8');
const modified=(path,before,after)=>({path,status:'M',before,after});
const added=path=>({path,status:'A',before:null,after:'3D verified test asset'});
function originalWithoutBridge(after){
 const a=after.indexOf('const GMWW_ARENA_OFFICIAL_ORIGIN=');
 const b=after.indexOf('\nfunction playLiveMembers()',a);
 assert.ok(a>0&&b>a);
 return after.slice(0,a).replace(/\n$/,'')+after.slice(b);
}
function originalHtml(after){
 const pairs=[
  ['aria-label="Vào Làng và thử nghiệm Arena 3D STAGING"','aria-label="Vào Làng Arena 3D chính thức"'],
  ['<small>THỬ NGHIỆM ARENA 3D</small>','<small>CHƠI ARENA 3D</small>'],
  ["const arenaUrl='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html';",
   "const arenaUrl='https://gmww-v2-00.williampham0702.workers.dev/village/arena-3d/live.html';"],
  ["overlay.setAttribute('aria-label','Thử nghiệm Arena 3D · STAGING');",
   "overlay.setAttribute('aria-label','GMWW Arena 3D · Phòng chơi thật');"],
  ["title.textContent='🌊 ARENA 3D · STAGING';","title.textContent='🌊 ARENA 3D';"],
  ["frame.title='Arena 3D STAGING — chỉ phòng thử nghiệm';",
   "frame.title='GMWW Arena 3D — kết nối phòng chơi thật';"],
  ["/* This Runtime-only experiment keeps the 2D menu/game untouched.\n * WebKit handles HTTPS inside subframes; its main-frame external navigation would open Safari.\n * This on-demand iframe stays on independent STAGING Worker/DO (not Production rooms). */",
   "/* Official Arena 3D uses the same Production origin and authoritative Core as 2D.\n * WebKit keeps the 3D world in its own disposable iframe, while native/GMWW host\n * credentials are only transmitted by origin-checked one-frame postMessage.\n * Never send a GM token in URL or across an untrusted origin. */"]
 ];
 let s=after;
 for(const [before,now] of pairs){
  assert.equal(s.split(now).length,2);
  s=s.replace(now,before);
 }
 return s;
}
const gm=read('server-game/current/app.js'),part=read('server-game/src/20-members-and-roster.part'),
 html=read('server-game/current/GMWW.html');
function expectedDiff(){
 return [
  modified('server-game/current/app.js',originalWithoutBridge(gm),gm),
  modified('server-game/src/20-members-and-roster.part',originalWithoutBridge(part),part),
  modified('server-game/current/GMWW.html',originalHtml(html),html),
  modified('assets/village/arena-3d/live.mjs','old scene','new scene'),
  added('tests/arena3d-portal-handoff.test.mjs'),
  added('assets/village/arena-3d/player.mjs'),
  added('docs/releases/GMWW-ARENA3D-STAGE35-20261025.md')
 ];
}
test('Arena 3D official CI: exact GM bridge and portal changes run direct Arena gates',()=>{
 assert.equal(classifyBrowserScope(expectedDiff()),'arena3d-official');
});
test('Arena 3D official CI: gameplay or Core mutations ALWAYS force full scope',()=>{
 for(const change of [
  modified('src/index.js','before','after'),
  modified('src/gmww-gallows-rules.js','before','after'),
  modified('server-game/src/40-battle-and-timeline.part','before','after'),
  modified('server-game/current/style.css','before','after')]){
  assert.equal(classifyBrowserScope([...expectedDiff(),change]),'full',change.path);
 }
});
test('Arena 3D official CI: reject modified GM bearer handoff, URL host or missing required tests',()=>{
 const good=expectedDiff(),app=good.find(x=>x.path==='server-game/current/app.js'),
  portal=good.find(x=>x.path==='server-game/current/GMWW.html');
 assert.equal(classifyBrowserScope(good.map(x=>x===app?{...x,after:x.after+'\n// changed gameplay'}:x)),'full');
 assert.equal(classifyBrowserScope(good.map(x=>x===app?{...x,after:x.after.replace(
  "const GMWW_ARENA_OFFICIAL_ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';",
  "const GMWW_ARENA_OFFICIAL_ORIGIN='https://attacker.example';")}:x)),'full');
 assert.equal(classifyBrowserScope(good.map(x=>x===portal?{...x,after:x.after+'\n<!-- unexpected -->'}:x)),'full');
 assert.equal(classifyBrowserScope(good.filter(x=>x.path!=='tests/arena3d-portal-handoff.test.mjs')),'full');
});
