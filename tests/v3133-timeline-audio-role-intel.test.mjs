import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolveWolfNight,resolveNightReveal} from '../src/gmww-wolf-night-resolution.js';
const read=p=>fs.readFileSync(p,'utf8');
const wolf=(id,actionId='action_wolf_bite',direction='')=>({loginId:id,actionId,direction,matchId:'match1',night:2,type:'effect_notice'});
const players=Object.fromEntries(['anna','bao','chi','duy'].map((id,i)=>['member:'+id,{loginId:id,seatId:i+1}]));
const resolve=rows=>resolveWolfNight({interactions:rows,players,matchId:'match1',night:2});

test('V3.133: witch receives actual attacked target, even when Guard prevents its death',()=>{
 const r=resolve([wolf('bao'),wolf('bao','action_protect')]);
 assert.equal(r.ok,true);
 assert.deepEqual(r.victims,[]);
 assert.equal(r.attacked[0].to,'bao');
 assert.equal(r.attacked[0].protected,true);
});
test('V3.133: Fairy shifts bite in real seat order before Guard check',()=>{
 const r=resolve([wolf('bao'),wolf('chi','action_protect'),wolf('anna','action_transfer_bite','right')]);
 assert.deepEqual(r.attacked.map(x=>x.to),['chi']);
 assert.deepEqual(r.blocked,['chi']);
 assert.deepEqual(r.victims,[]);
 assert.deepEqual(r.transfers,[{from:'bao',to:'chi',direction:'right'}]);
});
test('V3.133: explicit center button does not move bite; no bite never manufactures a victim',()=>{
 const stay=resolve([wolf('bao'),wolf('anna','action_transfer_bite','none')]);
 assert.deepEqual(stay.victims,['bao']);
 assert.equal(stay.attacked[0].direction,'none');
 const empty=resolve([wolf('anna','action_transfer_bite','left')]);
 assert.deepEqual(empty.victims,[]);
 assert.equal(empty.biteCount,0);
});
test('V3.133: witch Save is a confirmed guard against next morning bite resolution',()=>{
 const r=resolve([wolf('bao'),wolf('bao','action_witch_save')]);
 assert.deepEqual(r.blocked,['bao']);
 assert.deepEqual(r.victims,[]);
});
const assigned=[
 {loginId:'anna',roleId:'role_wolf',roleName:'Sói Thường',roleCard:{factionId:'wolf',functions:[{actionId:'action_wolf_bite'}]}},
 {loginId:'bao',roleId:'role_alpha_wolf',roleName:'Sói Trùm',roleCard:{factionId:'wolf'}},
 {loginId:'chi',roleId:'role_seer',roleName:'Tiên Tri',roleCard:{factionId:'village',functions:[{actionId:'action_seer'}]}}
];
test('V3.133: server-verified Seer recognizes regular wolf but Alpha appears non-wolf',()=>{
 const one=resolveNightReveal({actionId:'action_seer',targetIds:['anna'],assignments:assigned});
 const alpha=resolveNightReveal({actionId:'action_seer',targetIds:['bao'],assignments:assigned});
 assert.equal(one.message,'CÓ SÓI');assert.equal(alpha.message,'KHÔNG PHẢI SÓI');
 assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['unknown'],assignments:assigned}),null);
});
test('V3.133: other divination can show role abilities or group wolf status without revealing to Player Web',()=>{
 const aura=resolveNightReveal({actionId:'action_aura_read',targetIds:['chi'],assignments:assigned});
 assert.match(aura.message,/Tiên Tri/);assert.deepEqual(aura.targets[0].functions,['action_seer']);
 assert.equal(resolveNightReveal({actionId:'action_fox_scan',targetIds:['anna','chi'],assignments:assigned}).wolf,true);
 assert.equal(resolveNightReveal({actionId:'action_witch_kill',targetIds:['anna'],assignments:assigned}),null);
 const worker=read('src/index.js');
 assert.match(worker,/const nightIntel=String\(meta\.cyclePhase/);
 assert.match(worker,/battleUndo,battleActionUsage,nightIntel,winProposal/);
 assert.match(worker,/resolveNightReveal\(\{actionId/);
 assert.match(worker,/String\(body\?\.direction\|\|""\),body\?\.revealTargetIds\|\|\[\]/);
});
test('V3.133: Artifact first turn never resolves empty target to Xac Nhan audio',()=>{
 const src=read('server-game/src/30-village-and-setup.part');
 let a=src.indexOf('function battleFindAudio('),b=src.indexOf('async function battleWarmAudio(',a);
 assert.ok(a>0&&b>a);
 const ctx={state:{audio:{system:[
 {id:'audio_system_confirm',name:'Xác nhận',targetId:''},
 {id:'audio_system_early_artifacts',name:'Artifact đầu ván',targetId:'audio_system_early_artifacts'}
 ]}}};
 vm.runInNewContext(src.slice(a,b)+'\n globalThis.findAudio=battleFindAudio;',ctx);
 assert.equal(ctx.findAudio('system','','Không có âm phù hợp'),null);
 assert.equal(ctx.findAudio('system','audio_system_early_artifacts','Artifact đầu ván').id,'audio_system_early_artifacts');
 assert.equal(ctx.findAudio('system','audio_system_confirm','Xác nhận').id,'audio_system_confirm');
});
test('V3.133: correct audio maps wolf-group, Old Witch, Snow Wolf, Artifact and dawn',()=>{
 const src=read('server-game/src/30-village-and-setup.part');
 const a=src.indexOf('function battleTurnAudioCue('),b=src.indexOf('function battleAudioForTurn(',a);
 assert.ok(a>0&&b>a);
 const ctx={};vm.runInNewContext(src.slice(a,b)+'\n globalThis.cue=battleTurnAudioCue;',ctx);
 assert.equal(ctx.cue({kind:'role-group',roles:[{roleId:'role_wolf'},{roleId:'role_alpha_wolf'}]}).targetId,'audio_group_wolves');
 assert.equal(ctx.cue({kind:'role',roleId:'role_snow_wolf',label:'Sói Tuyết'}).targetId,'role_snow_wolf');
 assert.equal(ctx.cue({kind:'role',roleId:'role_old_witch',label:'Phù Thuỷ Già'}).targetId,'role_old_witch');
 assert.equal(ctx.cue({kind:'early-artifact-window'}).targetId,'audio_system_early_artifacts');
 assert.equal(ctx.cue({kind:'village-wakeup'}).name,'Làng ơi dậy đi');
 assert.match(src,/battleSpeakCue/);
});
test('V3.133: timeline numbers and GM movable controls retain role and effect safeguards',()=>{
 const ctx={};vm.runInNewContext(read('server-game/current/battle-controls.js'),ctx);
 assert.equal(ctx.GMWW_BATTLE_CONTROLS.timeline('day',null,4)[0].label,'Ngày thứ 4');
 const night={cursor:0,completed:false,queue:[{id:'intro',kind:'wolf-introduction'},{id:'wake',kind:'village-wakeup'}]};
 const list=ctx.GMWW_BATTLE_CONTROLS.timeline('night',night,4);
 assert.equal(list[0].label,'Bầy sói ơi dậy đi');
 assert.equal(list[1].label,'Ngày thứ 4');
 const runtime=read('server-game/current/app.js'),parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(runtime,parts.map(p=>read('server-game/src/'+p)).join(''));
 assert.match(runtime,/battleBindConfirmDrag\(\)/);
 assert.match(runtime,/battleShowResultPopup\('🔮 KẾT QUẢ SOI XÉT'/);
 assert.match(runtime,/data-transfer="none"/); // generated through 3-option list
 const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css');
 assert.match(html,/id="battleResultPopup"/);assert.match(html,/id="battleResultClose"/);
 assert.match(css,/grid-template-columns:none!important/);assert.match(css,/gmww-transfer-directions/);
 assert.match(css,/battleTargetConfirm\{\s*touch-action:none/);
 assert.match(runtime,/const VERSION='3\.133'/);
 assert.match(read('src/index.js'),/VERSION="V3\.133"/);
});
