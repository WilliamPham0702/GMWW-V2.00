import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {playerServerMenuBundle} from '../.github/scripts/player-server-menu.mjs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('DEMO running remains in directory after normal lease expiry without exposing ordinary expired rooms',()=>{
 const worker=read('src/index.js');
 assert.match(worker,/activeDemo=r\?\.demo===true&&phase==="running"&&r\?\.enabled!==false/);
 assert.match(worker,/if\(!activeDemo&&\(\(lease&&nowMs>lease\)/);
});
test('late join requires authenticated member and cannot disable lock or change ordinary match rules',()=>{
 const worker=read('src/index.js');
 assert.match(worker,/if\(meta\.demo===true&&!body\?\.member\?\.loginId\)return j\(\{ok:false,error:"DEMO_LOGIN_REQUIRED"/);
 assert.match(worker,/if\(inProgress&&!known&&meta\.demo!==true\)return j\(\{ok:false,error:"ROOM_IN_PROGRESS"/);
 assert.match(worker,/if\(!inProgress\)meta\.locked=false/);
 assert.match(worker,/humanControlled:meta\.demo===true\|\|players\[key\]\?\.humanControlled===true/);
});
test('Player Web joins single live DEMO but never grants another role without an assignment',()=>{
 const village=read('src/player-web-src/20-village-and-profile.part');
 const rooms=read('src/player-web-src/30-rooms-and-realtime.part');
 const demo=read('src/gmww-demo-runner.js');
 assert.match(village,/if\(demos\.length!==1\)return false;/);
 assert.match(village,/return await joinRoom\(demos\[0\]\.code\)/);
 assert.match(rooms,/r\.demo===true&&r\.phase==='running'/);
 assert.match(demo,/!ctx\.assignments\.some\(a=>a\.loginId===loginId\)/);
});
test('Source bundles are byte-identical to the released Player Web and GM',()=>{
 const parts=['00-bootstrap-and-session.part','10-role-card-artwork.part','20-village-and-profile.part','30-rooms-and-realtime.part','35-online-chat.part','40-cards-and-game.part','50-privacy-and-runtime.part'];
 const playerBody=parts.map(n=>read('src/player-web-src/'+n)).join('').replace("'use strict';",()=>"'use strict';\nconst GMWW_SERVER_MENU="+JSON.stringify(playerServerMenuBundle(process.cwd()))+";\n");
 assert.equal(read('src/gmww-members-live.js'),'export const gmwwMembersLiveScript = '+JSON.stringify(playerBody)+';\n');
 const gmParts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
 assert.equal(read('server-game/current/app.js'),gmParts.map(n=>read('server-game/src/'+n)).join(''));
});
