import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveNightReveal,DIVINATION_ACTION_IDS} from '../src/gmww-wolf-night-resolution.js';
const read=path=>fs.readFileSync(path,'utf8');
const assignments=[
  {loginId:'wolf',roleId:'role_wolf',roleName:'Sói',faction:'Phe Sói',roleCard:{factionId:'wolf',functions:[]}},
  {loginId:'alpha',roleId:'role_alpha_wolf',roleName:'Sói Trùm',faction:'Phe Sói',roleCard:{factionId:'wolf',functions:[]}},
  {loginId:'seer',roleId:'role_seer',roleName:'Tiên Tri',faction:'Phe Dân',roleCard:{factionId:'village',functions:[{actionId:'action_seer'}]}},
  {loginId:'guard',roleId:'role_guard',roleName:'Bảo Vệ',faction:'Phe Dân',roleCard:{factionId:'village',functions:[]}},
  {loginId:'third',roleId:'role_assassin',roleName:'Sát Thủ',faction:'Phe Ba',roleCard:{factionId:'third',functions:[]}}
];
const reveal=(actionId,targetIds)=>resolveNightReveal({actionId,targetIds,assignments});
test('V3.141 divination: all real role scans have correct result types and target counts',()=>{
 const ids=['action_seer','action_aura_read','action_fox_scan','action_bear_scan',
   'action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction'];
 ids.forEach(id=>assert.ok(DIVINATION_ACTION_IDS.includes(id),id));
 assert.equal(reveal('action_seer',['alpha']).wolf,false,'Alpha wolf fools the regular Seer');
 assert.equal(reveal('action_fox_scan',['wolf','seer','guard']).wolf,true);
 assert.equal(reveal('action_bear_scan',['alpha','guard']).wolf,true);
 assert.equal(reveal('action_scan_three',['alpha','guard','third']).wolf,true);
 assert.equal(reveal('action_find_seer',['seer']).message,'TIÊN TRI');
 assert.equal(reveal('action_find_seer',['guard']).message,'KHÔNG PHẢI TIÊN TRI');
 assert.equal(reveal('action_destroyer_scry',['seer']).message,'Tiên Tri');
 assert.equal(reveal('action_compare_faction',['guard','seer']).message,'CÙNG PHE');
 assert.equal(reveal('action_compare_faction',['wolf','seer']).message,'KHÁC PHE');
 assert.equal(reveal('action_aura_read',['seer']).message,'Tiên Tri');
 assert.equal(reveal('action_fox_scan',['wolf']),null,'never display a result for an incomplete scan');
 assert.equal(reveal('action_transfer_bite',['wolf']),null,'non-scan action must not leak results');
});
test('V3.141 fairy chooser: only three positional controls; no header and no extra OK',()=>{
 const battle=read('server-game/src/40-battle-and-timeline.part');
 const start=battle.indexOf('function battleRenderTransferPanel(){'),end=battle.indexOf('function battleCloseResultPopup(){',start);
 const code=battle.slice(start,end);
 assert.ok(code.includes("['left','↩️'")&&code.includes("['none','⏺️'")&&code.includes("['right','↪️'"));
 assert.ok(!code.includes('data-transfer-ok'));
 assert.ok(!code.includes('DỊCH CHUYỂN VẾT CẮN ⠿'));
 assert.ok(code.includes("battleState.transferDir=button.dataset.transfer;void battleConfirm(true)"));
 assert.ok(code.includes("const grip=panel.querySelector('.gmww-transfer-card')"));
 assert.ok(read('server-game/current/style.css').includes('grid-template-columns:repeat(3,42px)'));
 assert.ok(read('src/gmww-wolf-night-resolution.js').includes("const n=seated.findIndex(x=>x.loginId===origin)"));
});
test('V3.141 GM role labels: full wrapping and data-only faction coloring',()=>{
 const gm=read('server-game/src/30-village-and-setup.part'),css=read('server-game/current/style.css');
 assert.ok(gm.includes('data-faction='));
 assert.ok(gm.includes("roleFaction=factionRaw.includes('wolf')"));
 for(const f of ['village','wolf','third'])assert.ok(css.includes('.play-player-role[data-faction="'+f+'"]'));
 assert.ok(css.includes('overflow-wrap:anywhere!important'));
 assert.ok(read('assets/village/village.css').includes('white-space:normal!important'));
 assert.ok(!read('assets/village/village.mjs').includes('data-faction'),'do not leak GM faction to Player Web');
});
test('V3.141 role-result popup is scan-only and contains result without explanations',()=>{
 const code=read('server-game/src/40-battle-and-timeline.part');
 assert.ok(code.includes('if(revelation)battlePresentRevelation(a.actionId,revelation)'));
 assert.ok(code.includes("battleShowResultPopup('',String(revelation.message||''),true)"));
 assert.ok(!code.includes("battleShowResultPopup('🐺 KẾT QUẢ VẾT CẮN'"));
 assert.ok(!code.includes("battleMarkPlayers();battleTickCountdown();if(t&&phase==='night')battleShowWitchIntel(t)"));
 assert.ok(code.includes("popup.classList.toggle('is-scan-result',scanOnly)"));
});
test('V3.141 system audio: every scan result, final 30 seconds, time-up and wake-up have linkable IDs',()=>{
 const code=read('server-game/src/00-core-and-library.part'),battle=read('server-game/src/40-battle-and-timeline.part');
 const ids=['audio_system_day_wakeup','audio_system_countdown','audio_system_time_up',
   'audio_system_seer_wolf','audio_system_seer_not_wolf','audio_system_aura_read',
   'audio_system_destroyer_role','audio_system_fox_wolf','audio_system_fox_no_wolf',
   'audio_system_bear_wolf','audio_system_bear_no_wolf','audio_system_piper_wolf',
   'audio_system_piper_no_wolf','audio_system_find_seer_yes','audio_system_find_seer_no',
   'audio_system_compare_same','audio_system_compare_different'];
 ids.forEach(id=>assert.ok(code.includes("id:'"+id+"'"),id));
 assert.ok(code.includes('...(previous||{})'),'previous GM audio links must be preserved');
 assert.ok(battle.includes("battlePlayConfiguredAudio('system','audio_system_time_up','Hết giờ')"));
 assert.ok(battle.includes("battlePlayConfiguredAudio('system','audio_system_countdown','Đếm ngược 30 giây cuối')"));
});
test('V3.141 wake-up audio completion advances via Server to day exactly once',()=>{
 const battle=read('server-game/src/40-battle-and-timeline.part'),audio=read('server-game/src/30-village-and-setup.part');
 assert.ok(battle.includes('function battlePlayWakeupAndAdvance(turn,key)'));
 assert.ok(battle.includes('battleState.wakeAudioStartedKey===key'));
 assert.ok(battle.includes('await advancePlayPhase(); // Complete the actual wake-up turn'));
 assert.ok(battle.includes("if(t.kind==='village-wakeup')battlePlayWakeupAndAdvance(t,key)"));
 assert.ok(audio.includes('cue.onend=()=>onFinished?.()'));
 assert.ok(audio.includes('player.onended=()=>'));
 assert.ok(audio.includes('source.onended=()=>{if(globalThis.gmwwBattleBufferSource===source){globalThis.gmwwBattleBufferSource=null;onFinished?.()}}'));
});
