import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('TASK #444: bundled GM runtime equals split source after Day/Night menu change',()=>{
 const fragments=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(read('server-game/current/app.js'),fragments.map(n=>read('server-game/src/'+n)).join(''));
});

test('TASK #444: both phases use current saved fire anchor, not the previous phase',()=>{
 const src=read('server-game/current/app.js');
 const fire=src.slice(src.indexOf('function gmwwPlaceWolfMenuAtFire(menu){'),src.indexOf('\nfunction demoTurnDescription('));
 assert.match(fire,/const core=fire\.closest\('\.play-village-core'\)/);
 assert.match(fire,/const \[x,y\]=villageFirePosition\(\)/);
 assert.ok(fire.indexOf('core.style.left=x')<fire.indexOf('fire.getBoundingClientRect()'),'move fire marker before measuring its pixel position');
 assert.ok(fire.indexOf('core.style.top=y')<fire.indexOf('fire.getBoundingClientRect()'),'move touch area before popup placement');
 assert.match(fire,/core\.dataset\.gmwwFirePhase=playSceneState\.phase==='night'\?'night':'day'/);
 assert.match(fire,/menu\.style\.setProperty\('left'/);
 assert.match(fire,/menu\.style\.setProperty\('top'/);
 assert.match(src,/fireAnchors\?\.\[key\]/,'independent Day and Night image-specific markers must be retained');
 assert.match(src,/document\.querySelector\('\.play-core-pearl'\)\?\.addEventListener\('click',\(\)=>\{if\(playSceneState\.step==='battle'\)\{battleToggleWolfMenu\(\);return\}openPlayCreateRoomSheet\(\)\}\)/);
});

test('TASK #444: phase switches reset an earlier manual GM-menu drag',()=>{
 const src=read('server-game/current/app.js');
 assert.match(src,/const gameKey=\[playSceneRuntime\.room\?\.matchId\|\|'',phase,night\]\.join\(':'\)/);
 assert.match(src,/delete wolfMenu\.dataset\.gmwwUserMoved/);
 assert.match(src,/gmwwPlaceWolfMenuAtFire\(wolfMenu\)/);
});
