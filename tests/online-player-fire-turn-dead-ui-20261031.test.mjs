import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {playerServerMenuBundle} from '../.github/scripts/player-server-menu.mjs';

const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const village=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
test('fire action offers stay visible after menu inactivity; no GM powers are exposed',()=>{
 assert.match(chat,/#gmwwOnlineDock\.is-idle-hidden\{opacity:1;pointer-events:auto\}/);
 assert.match(chat,/gmwwOnlinePlaceAtFire\(dock\)/);
 assert.match(chat,/actionKey:action\.key,targetIds:pick\.targets/);
 assert.match(chat,/state\.onlineActions\|\|\[\]/);
 assert.match(chat,/function gmwwOnlineTurnEffects\(offers\)/);
 assert.match(chat,/doc\.querySelectorAll\('#players \.player\[data-player-id\]'\)/);
 assert.match(village,/gmww:village-ready'[\s\S]*?gmwwOnlineTurnEffects/);
});
test('dead chat uses blue notice and frozen day chat uses explicit reason',()=>{
 assert.match(chat,/result\.reason==='CHAT_DEAD'/);
 assert.match(chat,/Bạn đã chết nên không chat được\./);
 assert.match(chat,/gmww-chat-dead-notice\{display:block!important;color:#69d8ff/);
 assert.match(chat,/result\.reason==='CHAT_FROZEN'/);
 assert.match(chat,/result\.reason==='CHAT_EXPELLED'/);
 assert.match(chat,/Bạn đã bị đuổi khỏi làng nên không chat được\./);
 assert.match(chat,/result\.reason==='CHAT_MUTED_GM'/);
 assert.match(chat,/result\.reason==='CHAT_MUTED_ARTIFACT'/);
 assert.match(chat,/Bạn đang bị đóng băng nên không chat được\./);
});
test('Player packaged script remains exact source and keeps GM menu',()=>{
 const parts=['00-bootstrap-and-session','10-role-card-artwork','20-village-and-profile','30-rooms-and-realtime','35-online-chat','40-cards-and-game','50-privacy-and-runtime'];
 const body=parts.map(p=>readFileSync('src/player-web-src/'+p+'.part','utf8')).join('')
  .replace("'use strict';",()=>"'use strict';\nconst GMWW_SERVER_MENU="+JSON.stringify(playerServerMenuBundle(process.cwd()))+";\n");
 assert.equal(gmwwMembersLiveScript,body);
});
