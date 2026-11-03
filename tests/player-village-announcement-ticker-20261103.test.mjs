import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicChatNotices,mergePublicChatNotices} from '../src/gmww-online-chat-policy.js';

const meta={phase:'running',cyclePhase:'morning',cycleNight:1,matchId:'ticker-match'};
const players={
 'member:target':{displayName:'A Dũng'},
 'member:secret':{displayName:'Quyền'},
 'member:other':{displayName:'Nô'}
};
const selected={id:'assassin-mark',type:'assassin_mark',loginId:'target',actorId:'secret',
 matchId:meta.matchId,night:1,gmChoice:'👍',status:'pending',effectActive:true,
 createdAt:'2026-11-03T08:00:00.000Z'};
const responded={...selected,status:'responded',effectActive:false,response:'👎',
 respondedAt:'2026-11-03T09:00:00.000Z'};

test('public bulletin retains selected notification and result in chronological order',()=>{
 const before=publicChatNotices(meta,players,[selected]);
 const after=publicChatNotices(meta,players,[responded]);
 assert.deepEqual(before.map(x=>x.text),['A Dũng đã bị Sát Thủ chọn.']);
 assert.deepEqual(after.map(x=>x.text),[
  'A Dũng đã bị Sát Thủ chọn.',
  'Chia buồn A Dũng đã lựa chọn sai và đã chết.'
 ]);
 assert.equal(before[0].id,after[0].id,'mark event ID remains stable after response');
 assert.notEqual(after[0].id,after[1].id,'result has independent ID');
 assert.ok(after[0].at<after[1].at,'chronological events');
 assert.deepEqual(mergePublicChatNotices(before,after),after,'no duplicates on refresh');
 const payload=JSON.stringify(after);
 assert.doesNotMatch(payload,/Quyền|quyen|actorId|gmChoice|role_assassin|action_assassin_mark/);
});

test('first public announcement remains immutable after a replay changes display text',()=>{
 const first=publicChatNotices(meta,players,[selected]);
 const tampered=[{...first[0],text:'Quyền là Sát Thủ',at:first[0].at+4000}];
 const merged=mergePublicChatNotices(first,tampered);
 assert.deepEqual(merged,first,'replays must not rewrite an already-public message');
 assert.equal(mergePublicChatNotices(merged,first).length,1,'same ID must remain deduplicated');
});

test('durable public ledger does not lose an already announced event when state expires',()=>{
 const before=publicChatNotices(meta,players,[selected]);
 const dead={id:'death',type:'dead',loginId:'other',night:1,matchId:meta.matchId,
  effectActive:true,createdAt:'2026-11-03T10:00:00.000Z'};
 const after=publicChatNotices(meta,players,[{...selected,effectActive:false,status:'cleared'},dead]);
 const merged=mergePublicChatNotices(before,after);
 assert.equal(merged.length,2);
 assert.equal(merged[0].text,'A Dũng đã bị Sát Thủ chọn.');
 assert.equal(merged[1].text,'Đêm qua Nô đã chết.');
 assert.deepEqual(mergePublicChatNotices(merged,after),merged);
});

test('current cycle only and night secrecy stay authoritative',()=>{
 const older={id:'old',type:'dead',loginId:'other',night:1,matchId:meta.matchId,createdAt:selected.createdAt,effectActive:true};
 assert.deepEqual(publicChatNotices({...meta,cyclePhase:'night'},players,[selected,responded]),[]);
 assert.deepEqual(publicChatNotices({...meta,cycleNight:2},players,[older]),[]);
 assert.deepEqual(publicChatNotices({...meta,matchId:'different'},players,[selected]),[]);
});

test('Worker stores public-only per-day archive and serves it even when chatting is blocked',()=>{
 const source=readFileSync('src/index.js','utf8');
 assert.match(source,/villagePublicBulletin:/);
 assert.match(source,/mergePublicChatNotices\(notices,latest\)/);
 assert.match(source,/this\.villageHistoryForMatch\(meta,rows\)/);
 assert.match(source,/noticeCycleNight=resolved\?currentNight:phase==="night"\?currentNight-1:0/);
 assert.match(source,/if\(!permission\.canRead\)return j\(\{ok:true,channel:null,messages:\[\],broadcasts,notices,noticeCycleNight/);
 assert.match(source,/publicChatNotices\(meta,players,source\)/);
});

test('Player Web ticker loops slowly and messages/voice remain borderless',()=>{
 const source=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 assert.match(source,/id="gmwwVillageTicker"/);
 assert.match(source,/🎬:/);
 assert.match(source,/@keyframes gmww-village-marquee/);
 assert.match(source,/--gmww-ticker-duration/);
 assert.match(source,/Math\.ceil\(distance\/28\)/);
 assert.match(source,/#gmwwChatLines \.msg\{max-width:100%!important;width:auto!important;[^}]*border:0!important/);
 assert.match(source,/\.gmww-voice-card\{border:0!important;[^}]*background:transparent!important/);
 assert.match(source,/gmwwVillageTickerUpdate\(result\.notices,result\.noticeCycleNight\)/);
 assert.doesNotMatch(source,/const items=\[\.\.\.\(Array\.isArray\(result\.notices\)/);
 assert.match(source,/@media\(prefers-reduced-motion:reduce\)\{#gmwwVillageTicker/);
});
