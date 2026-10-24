import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Gallows iPhone: shared toolbar keeps space for both seconds and Server clock',()=>{
 const css=read('server-game/current/style.css');
 const html=read('server-game/current/GMWW.html');
 assert.match(css,/grid-template-columns:minmax\(106px,28%\) minmax\(62px,72px\) minmax\(57px,66px\)/);
 for(const id of ['battleGallowsModeToggle','battleGallowsSeconds','battleGallowsClock'])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('id="battleGallowsModeToggle"')<html.indexOf('id="battleGallowsSeconds"'));
 assert.ok(html.indexOf('id="battleGallowsSeconds"')<html.indexOf('id="battleGallowsClock"'));
});

test('Player village shows ONLY one red pirate flag anchored at fire during nomination',()=>{
 const village=read('assets/village/village.mjs');
 const player=read('src/player-web-src/30-rooms-and-realtime.part');
 assert.match(village,/flag\.id='gmwwPirateNominate'/);
 assert.match(village,/fill="#e73543"/);
 assert.match(village,/const point=screenPoint\(layout\.fire\)/);
 assert.match(village,/flag\.hidden=!visible/);
 assert.match(village,/flag\.style\.pointerEvents='none'/);
 assert.match(village,/document\.elementFromPoint\(e\.clientX,e\.clientY\)/);
 assert.match(village,/gmww:gallows-drag-nominate/);
 assert.match(village,/gmww:gallows-open-nominations/);
 assert.match(player,/dock\.hidden=!\(\['voting','closed','resolved'\]\.includes\(stage\)\)/);
 assert.doesNotMatch(player,/id="gmwwGallowsOpenNomination"/);
});

test('Double tap opens living nominees in separate cards, OK and reset above, Server validates',()=>{
 const player=read('src/player-web-src/30-rooms-and-realtime.part');
 const host=read('src/player-web-src/20-village-and-profile.part');
 const worker=read('src/index.js');
 const grid=player.indexOf('id="gmwwGallowsGrid"');
 const ok=player.indexOf('id="gmwwGallowsNominate"');
 const reset=player.indexOf('id="gmwwGallowsReset"');
 assert.ok(ok>=0&&reset>ok&&grid>reset,'OK/Khôi Phục should precede grid');
 for(const item of ['gmww-gallows-candidate','data-gallows-nominee','state.gallowsSelectedId',
   'id!==me&&eligible.includes(id)','gallowsSubmitPending'])
   assert.ok(player.includes(item),'Missing '+item);
 assert.match(player,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(player,/const chosen=String\(state\.gallowsSelectedId\|\|''\)/);
 assert.match(player,/sendGallowsChoice\('nominate',chosen\)/);
 assert.match(host,/event\.origin!==location\.origin/);
 assert.match(host,/gallows-open-nominations/);
 assert.match(worker,/async playerGallows\(/);
 assert.doesNotMatch(player,/id="gmwwGallowsNominee"/);
});

test('GM dead visibility only changes local render; revives and Server roster remain intact',()=>{
 const html=read('server-game/current/GMWW.html');
 const gm=read('server-game/src/40-battle-and-timeline.part');
 const css=read('server-game/current/style.css');
 assert.match(html,/id="battleShowDead"/);
 assert.match(gm,/dead:saved\.dead!==false/);
 assert.match(gm,/battleShowDead','dead'/);
 assert.match(gm,/localStorage\.setItem\(GMWW_GM_LABEL_KEY/);
 assert.match(gm,/gmww-hide-dead-players/);
 assert.match(css,/#playShell\.gmww-hide-dead-players #playPlayerRing \.play-player-token\.is-dead\{display:none!important\}/);
 assert.match(gm,/battleQuickRevive/);
});
