import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=await readFile(resolve(root,'src/gmww-members-page.js'),'utf8');
const live=await readFile(resolve(root,'src/gmww-members-live.js'),'utf8');
const worker=await readFile(resolve(root,'src/index.js'),'utf8');
const villageCss=await readFile(resolve(root,'assets/village/village.css'),'utf8');
await import(pathToFileURL(resolve(root,'assets/village/village-layout.js')));
const layout=globalThis.GMWW_VILLAGE_LAYOUT;

test('registration exposes exactly 42 full chibi characters and no thumbnail fallback',async()=>{
  const files=(await readdir(resolve(root,'assets/characters/v253'))).filter(x=>/^chibi-\d{2}\.webp$/.test(x));
  assert.equal(files.length,42);
  assert.match(page,/Chọn Nhân Vật Chibi/);
  assert.match(page,/Xem đủ 42 Nhân Vật/);
  assert.match(page,/#create \.avatar-picks img[^}]+object-fit:contain/);
  assert.match(live,/state\.gameCharacters/);
  assert.match(live,/gameCharacterId:state\.selectedAvatarId/);
  const handlerStart=worker.indexOf('async function gameCharacterImage');
  const imageHandler=worker.slice(handlerStart,worker.indexOf('\nfunction firstFreeSeat',handlerStart));
  assert.doesNotMatch(imageHandler,/return fallback\?avatarImage/);
  assert.match(imageHandler,/Chibi not found/);
});

test('waiting lobby is minimal and login enters the village lobby',()=>{
  assert.match(page,/#game\.screen\.active \.game-top\{display:none!important\}/);
  assert.match(page,/#gmwwGameViewTabs:has\(\[data-game-pane="role"\]:disabled\)\{display:none!important\}/);
  assert.match(live,/async function login\(\)[\s\S]*?await enterVillage\(\);return/);
  assert.match(live,/if\(state\.member\)[\s\S]*?await enterVillage\(\)/);
});

test('campfire hotspot has no visible square and lower bridge remains walkable',()=>{
  assert.match(villageCss,/html\.embedded \.fire\{display:block!important;inset:auto!important;width:84px!important;height:84px!important/);
  assert.match(villageCss,/opacity:0!important/);
  assert.equal(layout.inside(50,96),true);
  assert.deepEqual(layout.clampPoint(50,96),{x:50,y:96});
  for(const blocked of [[50,20],[8,40],[92,40],[20,95],[70,95]])assert.equal(layout.inside(...blocked),false);
});
