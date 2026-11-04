import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('V3.301 Runtime: versions, channel, release notes and rollback are consistent',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
 const app=read('server-game/current/app.js');
 assert.equal(parts.map(p=>read('server-game/src/'+p)).join(''),app);
 const worker=read('src/index.js');
 assert.match(worker,/NATIVE_SHELL_VERSION="3\.264"/,'V3.301 must not require a new IPA');
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/"V3\.301 – Thoại: thêm nút 🗑️/);
 const notes=read('docs/releases/GMWW-RUNTIME-V3.301-VOICE-DISCARD-GALLOWS-ICON-20261104.md');
 assert.match(notes,/Không đổi IPA/);
 assert.match(notes,/Rollback[\s\S]*V3\.300/);
});

test('V3.301 ships voice discard on GM and Player Web, and icon B on GM gallows nomination',()=>{
 assert.ok(read('server-game/current/app.js').includes('🗑'),'GM voice discard control');
 assert.ok(read('src/gmww-members-live.js').includes('🗑'),'Player Web voice discard control');
 assert.ok(read('server-game/current/style.css').includes('gmww-gallows-nominate-b.png'),'GM icon B');
 readFileSync('server-game/current/action-icons/gmww-gallows-nominate-b.png');
});
