import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rd=p=>readFileSync(p,'utf8');
test('V3.259: Verify Production uses native project/IPA, not legacy V3.110',()=>{
 const v=rd('.github/scripts/verify-character40-production.mjs');
 const native=rd('server-game/GMWW-Server.xcodeproj/project.pbxproj');
 const index=rd('src/index.js');
 assert.match(v,/nativeProject\.match\(\/MARKETING_VERSION/);
 assert.match(v,/published\.shellVersion,nativeShell/);
 assert.match(v,/published\.ipa\?\.version,nativeShell/);
 assert.match(v,/published\.minimumShellVersion,nativeShell/);
 assert.ok(!v.includes("published.shellVersion,'3.110'"));
 assert.match(native,/MARKETING_VERSION = 3\.257;/);
 assert.match(index,/VERSION="V3\.259",NATIVE_SHELL_VERSION="3\.257"/);
 assert.match(index,/UPDATE_CHANNEL_REV="runtime-3259"/);
});
test('PR565 unchanged GM three UI and V3.258 audio',()=>{
 const app=rd('server-game/current/app.js'),css=rd('server-game/current/style.css');
 assert.ok(!app.includes('🐺 VẾT CẮN · PHÙ THỦY'));
 assert.match(app,/function battleQueueDayAudio\(/);
 assert.match(css,/gmwwNominationVoteBounce/);
 assert.match(css,/\.battle-gallows-vote-mark/);
});
