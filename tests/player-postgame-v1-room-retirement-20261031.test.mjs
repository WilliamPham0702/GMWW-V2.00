import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const get=p=>fs.readFileSync(p,'utf8');
const v=get('src/player-web-src/20-village-and-profile.part');
const r=get('src/player-web-src/30-rooms-and-realtime.part');
const f=get('src/player-web-src/50-privacy-and-runtime.part');
const page=get('src/player-page-src/10-body-and-roles.part');
test('old room picker is absent, including history and fire entry points',()=>{
 assert.doesNotMatch(page,/<section id="rooms"/);
 assert.doesNotMatch(page,/PHÒNG ĐANG HOẠT ĐỘNG/);
 assert.match(page,/VỀ LÀNG ›/);
 assert.match(v,/if\(id==='rooms'\)id=state.member\?'game':'login'/);
 assert.doesNotMatch(v+f,/go\('rooms'\)/);
 assert.doesNotMatch(r,/Hãy chọn Phòng để tham gia lại/);
});
test('GM stage drives the displayed room destination',()=>{
 const code=v.slice(v.indexOf('function playerScenePolicy('),v.indexOf('function updatePlayerTopMenu('));
 const ctx={state:{roomCode:'ABCDEF',room:{phase:'lobby',gmStage:'seats'},villageCycle:{}},currentRoomPlayer:()=>({seatId:3})};
 vm.createContext(ctx);vm.runInContext(code+';globalThis.status=playerTopMenuStatus',ctx);
 assert.equal(ctx.status(),'TẬP HỢP · SETUP GHẾ');
 ctx.state.room.gmStage='game';assert.equal(ctx.status(),'CHUẨN BỊ VÁN MỚI');
 ctx.state.room.gmStage='room';assert.match(ctx.status(),/PHÒNG CHỜ/);
 ctx.state.roomCode='';assert.equal(ctx.status(),'SẢNH CHỜ');
});
const source=f.slice(f.indexOf('async function closeResult(){'),f.indexOf('} window.closeResult=closeResult;')+1);
function harness(removed){
 const calls=[],state={roomCode:'ABCDEF',participantId:'member:one',room:{phase:'ended'},players:[],ready:false,
 role:{},roles:[],roleOpen:false,artifact:null,artifactOpen:false,roleEffects:{}};
 const ctx={state,ACTIVE_ROLE_KEY:'k',clearDrunkDraw(){},clearRolePrivacyTimer(){},resultMatchKey:()=> 'match',
 rememberDismissedResult(){},stopVictorySound(){},clearTimeout(){},gmwwResultReturnTimer:null,
 $:()=>({classList:{remove(){}}}),clearArtifactDraft(){},renderRoleEffects(){},localStorage:{removeItem(){}},
 rememberActiveRoom(){},auth:()=>({}),encodeURIComponent,renderProfile(){},
 async api(url){calls.push(url);if(url.endsWith('/ready'))return {player:{ready:true}};
 if(url.endsWith('/me')){if(removed)throw Object.assign(new Error('removed'),{status:404});
 return {room:{phase:'lobby',gmStage:'seats'},player:{participantId:'member:one'}}}
 return {room:{phase:'lobby',gmStage:'seats'},players:[{participantId:'member:one'}]}},
 connectWS(){calls.push('ws')},startRoomStateWatch(){calls.push('watch')},
 sendPresence(){calls.push('presence')},async enterVillage(){calls.push('village')},
 async handleRoomMembershipLost(){calls.push('lost')}};
 vm.createContext(ctx);vm.runInContext(source+';globalThis.close=closeResult',ctx);
 return {state,calls,close:ctx.close};
}
test('retained participant closes result into village without rejoining',async()=>{
 const h=harness(false);await h.close();
 assert.deepEqual(h.calls.filter(x=>['ws','watch','village'].includes(x)),['ws','watch','village']);
 assert.equal(h.state.room.gmStage,'seats');assert.equal(h.state.participantId,'member:one');
 assert.ok(!h.calls.some(x=>x.endsWith('/join')));
});
test('GM release returns to waiting village, never reconnects removed participant',async()=>{
 const h=harness(true);await h.close();
 assert.ok(h.calls.includes('lost'));assert.ok(!h.calls.includes('ws'));
});
