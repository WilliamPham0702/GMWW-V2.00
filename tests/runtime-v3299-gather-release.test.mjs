import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('V3.299 source assembly, six-action gathering, safe rollback',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
 const app=read('server-game/current/app.js');
 assert.equal(parts.map(p=>read('server-game/src/'+p)).join(''),app);
 const html=read('server-game/current/GMWW.html');
 assert.match(html,/id="playGatherDistribute"/);
 assert.match(html,/id="playGatherDisband"/);
 assert.match(app,/async function playGatherCallMembers\(\)/);
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/V3\.299 – Tập hợp/);
 const notes=read('docs/releases/GMWW-RUNTIME-V3.299-GATHER-ONLINE-20261104.md');
 assert.match(notes,/Rollback/);assert.match(notes,/V3\.298/);assert.match(notes,/Audio Auto GM V3\.297/);
});
