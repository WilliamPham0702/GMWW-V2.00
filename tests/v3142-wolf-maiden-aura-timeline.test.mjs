import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isWolfAssignment,snowWolfMayBite,resolveMaidenNight,resolveNightReveal,resolveWolfNight}
 from '../src/gmww-wolf-night-resolution.js';
const read=p=>fs.readFileSync(p,'utf8');
const assignments=[
 {loginId:'snow',roleId:'role_snow_wolf',roleName:'Sói Tuyết',faction:'Phe Sói',roleCard:{factionId:'village'}},
 {loginId:'wolf',roleId:'role_wolf',roleName:'Sói Thường',faction:'Phe Sói'},
 {loginId:'alpha',roleId:'role_alpha_wolf',roleName:'Sói Trùm',faction:'Phe Sói'},
 {loginId:'seer',roleId:'role_seer',roleName:'Tiên Tri',faction:'Phe Dân'},
 {loginId:'hunter',roleId:'role_hunter',roleName:'Thợ Săn',faction:'Phe Dân'},
 {loginId:'maiden',roleId:'role_maiden',roleName:'Thiếu Nữ',faction:'Phe Dân'}
];
test('V3.142: Seer detects Snow Wolf even when a delivered card has stale faction, but not Alpha Wolf',()=>{
 assert.equal(isWolfAssignment(assignments[0]),true);
 assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['snow'],assignments}).message,'CÓ SÓI');
 assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['alpha'],assignments}).message,'KHÔNG PHẢI SÓI');
});
test('V3.142: Snow Wolf may only bite as the last surviving wolf, enforced on Server and GM',()=>{
 assert.equal(snowWolfMayBite({assignments,interactions:[],actorId:'snow',matchId:'m'}),false);
 const dead=['wolf','alpha'].map(loginId=>({loginId,type:'dead',effectActive:true,matchId:'m'}));
 assert.equal(snowWolfMayBite({assignments,interactions:dead,actorId:'snow',matchId:'m'}),true);
 const server=read('src/index.js'),gm=read('server-game/src/40-battle-and-timeline.part');
 assert.match(server,/SNOW_WOLF_PACK_ALIVE/);
 assert.match(gm,/roleId==='role_snow_wolf'/);
});
test('V3.142: Aura Seer only receives a role name and its private role-audio identity',()=>{
 const r=resolveNightReveal({actionId:'action_aura_read',targetIds:['hunter'],assignments});
 assert.equal(r.message,'Thợ Săn');assert.equal(r.targets[0].roleId,'role_hunter');
 assert.ok(read('server-game/src/30-village-and-setup.part').includes('async function battlePlayAuraRoleAudio('));
});
test('V3.142: Fairy arrows point in the requested on-screen direction',()=>{
 const players=Object.fromEntries(['maiden','snow','seer'].map((loginId,i)=>['member:'+loginId,{loginId,seatId:i+1}]));
 const base=[{type:'effect_notice',actionId:'action_wolf_bite',loginId:'snow',matchId:'m',night:1}];
 const move=direction=>resolveWolfNight({interactions:[...base,{type:'effect_notice',actionId:'action_transfer_bite',loginId:'seer',direction,matchId:'m',night:1}],players,matchId:'m',night:1});
 assert.deepEqual(move('right').victims,['maiden']);
 assert.deepEqual(move('left').victims,['seer']);
});
test('V3.142: Maiden dies visiting a wolf or dying host, but survives a bite while visiting a safe house',()=>{
 const visit=loginId=>[{type:'effect_notice',actionId:'action_visit_house',loginId,actorId:'maiden',matchId:'m',night:1}];
 assert.deepEqual(resolveMaidenNight({interactions:visit('wolf'),assignments,matchId:'m',night:1}).newVictims,['maiden']);
 assert.deepEqual(resolveMaidenNight({interactions:visit('hunter'),assignments,matchId:'m',night:1,wolfVictims:['hunter']}).newVictims,['maiden']);
 assert.deepEqual(resolveMaidenNight({interactions:visit('hunter'),assignments,matchId:'m',night:1,wolfVictims:['maiden']}).escaped,['maiden']);
 assert.deepEqual(resolveMaidenNight({interactions:[],assignments,matchId:'m',night:1,wolfVictims:['maiden']}).escaped,[]);
});
test('V3.142: auto-next, multiple drop count, audio prewarm, tap-outside and returned player opacity are wired',()=>{
 const b=read('server-game/src/40-battle-and-timeline.part'),audio=read('server-game/src/30-village-and-setup.part'),css=read('server-game/current/style.css');
 assert.ok(b.includes("void advancePlayPhase();"));
 assert.ok(b.includes("if(playSceneState.phase==='night'&&playSceneRuntime.nightRuntime?.currentId===t.id)"));
 assert.ok(b.includes('battle-multi-counter'));
 assert.ok(b.includes('battleState.targetSheet=false;renderPlayBattle()'));
 assert.ok(b.includes("if(!popup.contains(event.target))battleCloseResultPopup()"));
 assert.ok(audio.includes('const upcoming=index>=0?battleTurnAudioCue(queue[index+1]):null'));
 assert.ok(audio.includes("token.classList.toggle('is-'+kind,effect===kind)"));
 assert.ok(css.includes('#battleResultPopup.is-scan-result #battleResultClose{display:none'));
});
