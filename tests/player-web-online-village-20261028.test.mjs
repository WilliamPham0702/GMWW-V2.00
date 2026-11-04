import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {privateRoleGroupRecognition} from '../src/gmww-wolf-recognition.js';
const village=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const game=readFileSync('src/player-web-src/40-cards-and-game.part','utf8');
const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');
test('Online uses the existing village without transient card page on delivery',()=>{
  assert.match(village,/iframe\.src='\/village\/\?embed=1/);
  assert.match(game,/Do not auto-open an Online card screen/);
  assert.doesNotMatch(game,/sessionStorage\.setItem\(storageKey,deliveryKey\);setGameViewPane\('role'/);
});
test('Private mini cards sit below timeline and retain full-size card on tap',()=>{
  assert.match(village,/function syncPlayerMiniCards\(/);
  assert.match(village,/width:clamp\(28px,9\.5vw,39px\)/);
  assert.match(village,/gmww-player-menu-turn/);
  assert.match(game,/syncPlayerMiniCards\(\)/);
  assert.match(village,/roleName=isSelf\?String\(state\.role\?/);
});
test('Online chat stays inside the fixed bottom footer, closes on outside tap and 30s idle',()=>{
  assert.match(chat,/#gmwwOnlineFooter/);
  assert.match(chat,/function gmwwChatClosePanel\(/);
  assert.match(chat,/gmwwChatIdleTimer=setTimeout\(\(\)=>\{/);
  assert.match(chat,/\},30000\)/);
  assert.match(chat,/panel\?\.contains\(event\.target\)/);
  assert.match(chat,/#gmwwChatPanel\.open #gmwwChatLines\{display:block;height:90px/);
});
test('Role-group labels never reveal unrelated group, dead peer, or out-of-turn cards',()=>{
  const meta={phase:'running',cyclePhase:'night',cycleNight:1,matchId:'M'};
  const runtime={night:1,cursor:0,completed:false,queue:[{id:'G',kind:'role-group',roles:[
    {roleId:'seer',loginIds:['A','B']},{roleId:'guard',loginIds:['C','D']}]}]};
  const assignments=['A','B','C','D'].map((loginId,i)=>({loginId,roleId:i<2?'seer':'guard',roleName:i<2?'Tiên Tri':'Bảo Vệ',matchId:'M'}));
  const seen=privateRoleGroupRecognition(meta,runtime,'A',assignments);
  assert.deepEqual(seen.labels.map(x=>x.loginId).sort(),['a','b']);
  assert.deepEqual(privateRoleGroupRecognition(meta,runtime,'C',assignments).labels.map(x=>x.loginId).sort(),['c','d']);
  assert.equal(privateRoleGroupRecognition(meta,runtime,'A',assignments,[{loginId:'B',type:'dead',matchId:'M'}]),null);
  assert.equal(privateRoleGroupRecognition({...meta,cyclePhase:'morning'},runtime,'A',assignments),null);
  assert.equal(privateRoleGroupRecognition(meta,{...runtime,completed:true},'A',assignments),null);
  assert.equal(privateRoleGroupRecognition(meta,runtime,'stranger',assignments),null);
});
