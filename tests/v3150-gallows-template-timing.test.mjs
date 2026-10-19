import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sanitizeGameConfig} from '../src/gmww-room-config-rules.js';
import {gallowsOpen,gallowsBegin,gallowsNominate,gallowsCast,gallowsSnapshot,gallowsStage} from '../src/gmww-gallows-rules.js';
const meta={matchId:'test-match',cycleKey:'morning-2'};
const fresh=(nominationDurationSec=10,voteDurationSec=10)=>({
 id:'ballot1',...meta,day:2,stage:'ready',nominations:{},votes:{},blocked:[],
 eligible:['alice','bob','carol'],nominationDurationSec,voteDurationSec
});
test('V3.150 older Ván Mẫu gets 10 seconds for each Lên Giàn stage, while saved values persist',()=>{
 const old=sanitizeGameConfig({id:'legacy',name:'Ván cũ',timing:{villageDiscussionSec:300}});
 assert.equal(old.timing.gallowsNominationSec,10);
 assert.equal(old.timing.gallowsVoteSec,10);
 const configured=sanitizeGameConfig({id:'custom',timing:{gallowsNominationSec:23,gallowsVoteSec:38}});
 assert.equal(configured.timing.gallowsNominationSec,23);
 assert.equal(configured.timing.gallowsVoteSec,38);
 const bounded=sanitizeGameConfig({timing:{gallowsNominationSec:0,gallowsVoteSec:999999}});
 assert.equal(bounded.timing.gallowsNominationSec,10);
 assert.equal(bounded.timing.gallowsVoteSec,3600);
});
test('V3.150 GM opens 23s nomination at explicit gesture, nomination expires exactly on server deadline',()=>{
 const initial=fresh(23,38);
 assert.equal(gallowsNominate(initial,'alice','bob',1000).error,'NOMINATION_CLOSED');
 const started=gallowsOpen(initial,1000);
 assert.equal(started.ok,true);
 assert.equal(started.value.nominationStartedAt,1000);
 assert.equal(started.value.nominationDeadlineAt,24000);
 assert.equal(gallowsOpen(started.value,1001).ok,false);
 assert.equal(gallowsNominate(started.value,'alice','bob',23999).ok,true);
 assert.equal(gallowsNominate(started.value,'carol','bob',24000).error,'NOMINATION_CLOSED');
 assert.equal(gallowsStage(started.value,24000),'selecting');
 assert.equal(gallowsSnapshot(started.value,meta,24000).stage,'selecting');
});
test('V3.150 distinct 38s vote timer, one vote only, locked after deadline; legacy remains 10s',()=>{
 const opened=gallowsOpen(fresh(23,38),1000).value;
 const voting=gallowsBegin(opened,'bob',25000).value;
 assert.equal(voting.deadlineAt,63000);
 assert.equal(gallowsCast(voting,'alice','👍',62999).ok,true);
 assert.equal(gallowsCast(voting,'alice','👎',63000).error,'VOTE_DEADLINE_PASSED');
 assert.equal(gallowsSnapshot(voting,meta,63000).stage,'closed');
 const legacy={...fresh(),stage:'nominating',nominationDurationSec:undefined,voteDurationSec:undefined};
 assert.equal(gallowsBegin(legacy,'bob',100).value.deadlineAt,10100);
});
test('V3.150 template editor, GM, player UI and server share separate timer fields',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
 const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const id of ['playGallowsNominationSec','playGallowsVoteSec'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-gallows-command="open"/);
 assert.match(gm,/gallowsNominationSec/);
 assert.match(gm,/gallowsVoteSec/);
 assert.match(gm,/playRoomApi\('\/gallows'/);
 assert.match(gm,/nominationDeadlineAt/);
 assert.match(worker,/gallowsOpen\(ballot,now\)/);
 assert.match(worker,/gallowsDurationSec\(cfg\?\.timing\?\.gallowsNominationSec\)/);
 assert.match(worker,/gallowsDurationSec\(cfg\?\.timing\?\.gallowsVoteSec\)/);
 assert.match(player,/nominationDeadlineAt/);
 assert.match(player,/g\.voteDurationSec\|\|10/);
 const packaged=fs.readFileSync('server-game/current/app.js','utf8');
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
 '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(packaged,parts.map(f=>fs.readFileSync('server-game/src/'+f,'utf8')).join(''));
});
