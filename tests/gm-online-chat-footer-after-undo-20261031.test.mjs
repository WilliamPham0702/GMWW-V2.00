import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const gm=readFileSync('server-game/src/45-online-chat.part','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
test('GM footer places Chat directly after Restore, without duplicate chat',()=>{
 const s=html.slice(html.indexOf('id="battleBottomControls"'),html.indexOf('id="battleTargetSheet"'));
 const order=['battleDayGallowsFloat','battleUndoFloat','battleGMChatFloat'].map(id=>s.indexOf('id="'+id+'"'));
 assert.ok(order.every(x=>x>=0));assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 assert.equal((s.match(/id="battleGMChatFloat"/g)||[]).length,1);
 const match=s.match(/<button id="battleGMChatToggle"[^>]*>([\s\S]*?)<\/button>/);
 assert.ok(match,'GM Chat footer toggle is present');
 assert.equal(match[1].trim(),'💬','GM Chat footer must show only the 💬 icon, without a visible Chat text label');
 assert.match(match[0],/aria-label="Mở Chat GM"/,'Keep an accessible name for screen readers');
});
test('Chat monitor uses Player-style compact glass, retains GM authority and outside-dismiss',()=>{
 assert.match(gm,/#gmwwGMChatPanel\{display:none;position:fixed[\s\S]*?max-height:min\(44dvh,320px\)/);
 assert.match(gm,/#gmwwGMChatContent\{overflow-y:auto;overscroll-behavior:contain/);
 assert.match(gm,/gmwwGmChatDismiss/);
 assert.match(gm,/playRoomApi\('\/chat',\{method:'GET'\}\)/);
 assert.match(gm,/playRoomApi\('\/chat',\{method:'POST'/);
 assert.ok(app.includes(gm),'Compiled GM app must include the exact modified Chat source');
});
