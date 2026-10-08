import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const server=fs.readFileSync('src/index.js','utf8');
test('V3.38 keeps gathering toolbar available and restores async controls',()=>{
 assert.ok(app.includes("if(playSceneState.step==='seats'&&playSceneState.phase==='lobby')hidden=false"));
 assert.ok(app.includes("bar.classList.remove('is-auto-hidden')"));
 assert.ok(app.includes('renderPlayGatherToolbar(); // Restore button interactivity'));
});
test('V3.38 provides member/seat two-column manual selection and aligned leaf',()=>{
 for(const id of ['playSeatManualMembers','playGatherManual','playGatherConfirm'])assert.ok(html.includes(id));
 assert.ok(app.includes('function openPlaySeatManualSheet()'));
 assert.ok(css.includes('.play-seat-manual-columns{display:grid'));
 assert.ok(css.includes('.play-player-token.is-seat-occupied'));
});
test('V3.38 disbands one or all through existing authorized GM routes',()=>{
 for(const id of ['playGatherDisband','playDisbandSheet','playDisbandAll'])assert.ok(html.includes(id));
 assert.ok(app.includes("playRoomApi('/kick'"));
 assert.ok(app.includes("playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:[],replace:true})})"));
 assert.ok(server.includes('async gmKick(request,body)'));
 assert.ok(server.includes('async gmParticipants(request,body)'));
});
