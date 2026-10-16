import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('Room setup shows only the three compact interactive controls, without redundant captions',()=>{
 const start=html.indexOf('id="playRoomModeStep"');
 const block=html.slice(start,html.indexOf('</section>',start));
 assert.ok(start>0);
 assert.doesNotMatch(block,/>THIẾT LẬP</);
 assert.doesNotMatch(block,/CHẾ ĐỘ • TRẠNG THÁI • TIẾP/);
 for(const id of ['playRoomModeToggle','playCreateRoomEnabled','playRoomNextStep'])
   assert.match(block,new RegExp('id="'+id+'"'));
});

test('A seated player no longer has a separate leaf underneath; empty seats keep their leaf image',()=>{
 assert.match(app,/is-seat-occupied/);
 assert.match(app,/play-seat-leaf-art/);
 assert.doesNotMatch(css,/is-seat-occupied:not\(\.is-gm-rider\)::before\{[^}]*url\(/);
 const override=css.slice(css.indexOf('/* V3.121 — keep names'));
 assert.match(override,/\.is-seat-occupied:not\(\.is-gm-rider\)::before\{\s*content:none!important;display:none!important/);
 assert.match(override,/\.play-player-token:not\(\.is-empty\):not\(\.is-gm-rider\) \.play-player-over\{\s*bottom:calc\(100% - 18px\)!important/);
});

test('Wolf GM tools remain functional but display as an accessible horizontal swipe row',()=>{
 const block=html.slice(html.indexOf('id="battleWolfMenu"'),html.indexOf('id="battleDetails"'));
 assert.match(block,/class="battle-wolf-actions" role="group"[^>]*tabindex="0"/);
 for(const id of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
   assert.match(block,new RegExp('id="'+id+'"'));
 const override=css.slice(css.indexOf('/* V3.121 — Wolf GM tools:'));
 assert.match(override,/display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important/);
 assert.match(override,/overflow-x:auto!important;overflow-y:hidden!important/);
 assert.match(override,/grid-column:auto!important;flex:0 0 108px!important/);
});
