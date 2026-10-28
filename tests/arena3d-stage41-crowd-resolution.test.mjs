import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const player=readFileSync('assets/village/arena-3d/player.mjs','utf8');
test('GĐ41: 20–30 actors lower GPU pixel density only on public roster updates',()=>{
 assert.match(player,/items\.length>=20\?\.85:1\.1/);
 assert.match(player,/if\(pixelRatio!==lastPixelRatio\)/);
 assert.match(player,/renderer\.setPixelRatio\(pixelRatio\)/);
 assert.match(player,/lastSize=''/);
 const frame=player.slice(player.indexOf('function frame(now)'),player.indexOf("canvas.addEventListener('pointerdown'"));
 assert.doesNotMatch(frame,/setPixelRatio/);
});
test('GĐ41: crowd rendering does not interrupt public Core sync or private Player Web',()=>{
 assert.match(player,/connectStagingRoom\(\{roomCode:code/);
 assert.match(player,/onFrame:drawFrame/);
 assert.match(player,/\$\('player-core'\)\.src='\/join\/'/);
 assert.doesNotMatch(player,/\/api\/gm\//);
});
