import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const web=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const results=fs.readFileSync('src/player-web-src/50-privacy-and-runtime.part','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const card=fs.readFileSync('assets/role-card-back.webp');
const artwork=fs.readFileSync('src/player-web-src/10-role-card-artwork.part','utf8');

test('same original Role card-back image in GM and Player Web',()=>{
  assert.equal(card.subarray(0,4).toString(),'RIFF');
  assert.equal(card.subarray(8,12).toString(),'WEBP');
  const original=artwork.match(/const src='data:image\/webp;base64,([A-Za-z0-9+/=]+)'/);
  assert.ok(original);assert.deepEqual(card,Buffer.from(original[1],'base64'));
  assert.match(gm,/img\.src='role-card-back\.webp'/);
  assert.match(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),/copy\('assets\/role-card-back\.webp','role-card-back\.webp'\)/);
  assert.match(web,/gmww-card-back-img/);
});
test('Player Web has no new dialog, title, count or Finish button; selects exactly one card',()=>{
  const section=web.slice(web.indexOf('function renderDrunkDraw('),web.indexOf('async function submitDrunkDraw('));
  assert.match(section,/document\.getElementById\('game'\)\?\.classList\.contains\('active'\)/);
  assert.match(section,/String\(room\.phase\|\|''\)==='running'/);
  assert.match(section,/draw\?\.status==='pending'/);
  assert.match(section,/card\.onclick=\(\)=>submitDrunkDraw\(c\.id\)/);
  assert.doesNotMatch(section,/<h2>|<p>|dd-result|dd-finish|card\.textContent/);
  assert.match(web,/function disconnectRoom\(\)\{\s*gmwwChatUnmount\(\);clearDrunkDraw\(\)/);
  assert.match(results,/function showResult[\s\S]*?clearDrunkDraw\(\)/);
  assert.match(results,/async function closeResult\(\)\{\s*clearDrunkDraw\(\)/);
});
test('GM overlay stays inside game shell, not on unrelated homepage',()=>{
  const section=gm.slice(gm.indexOf('function battleRenderDrunkDraw('),gm.indexOf('// Nhãn MỤC TIÊU'));
  assert.match(section,/shell\.appendChild\(deck\)/);
  assert.doesNotMatch(section,/document\.body\.appendChild/);
  assert.match(section,/turn\?\.roleId==='role_drunk'/);
  assert.match(section,/row\?\.status==='pending'/);
  assert.match(section,/document\.getElementById\('start'\)\?\.classList\.contains\('active'\)/);
  assert.doesNotMatch(section,/textContent=.*SAY RƯỢU|className='deck-result'/);
  assert.match(gm,/if\(!visible\)\{\s*battleRenderDrunkDraw\(null\);/);
});
function roomHarness(){
  const snippet=worker.slice(worker.indexOf('  async gmReset('),worker.indexOf('  async alarm(){'));
  assert.ok(snippet.startsWith('  async gmReset('));
  const Room=vm.runInNewContext('(class Room{'+snippet+'})',{
    ROOM_IDLE_TTL:72*60*60*1000,
    j:result=>result,
    normalizeWinnerFaction:v=>v||'',
    publicRoom:x=>x,
    publicPlayer:x=>x,
    playerSetupComplete:()=>true,
    pruneInteractions:x=>x,
    normalizeLoginId:x=>String(x||'').toLowerCase()
  });
  const rows=new Map([
    ['meta',{phase:'running',matchId:'m-a',matchRevision:1,cyclePhase:'night',cycleNight:3,
      code:'ABCDE2',resetVersion:0,enabled:true}],
    ['players',{}],['assignments',[]],['interactions',[]],
    ['drunkDeck:m-a:3:actor',{selectedId:null,cards:[{id:'secret'}]}],
    ['drunkDeck:m-b:3:actor',{selectedId:null,cards:[{id:'other'}]}],
    ['history:m-a',{preserve:true}]
  ]);
  const storage={
    get:async key=>rows.get(key),
    put:async(key,value)=>rows.set(key,value),
    delete:async key=>rows.delete(key),
    list:async({prefix=''})=>new Map([...rows].filter(([key])=>key.startsWith(prefix))),
    setAlarm:async()=>{}
  };
  const room=new Room();
  room.ctx={storage};
  room.gmAuthorized=async()=>({ok:true,meta:rows.get('meta')});
  room.broadcast=()=>{};
  return {room,rows};
}
test('actual room end deletes only the match-scoped temporary deck, retains history',async()=>{
  const {room,rows}=roomHarness();
  const ack=await room.gmEnd(null,{matchId:'m-a',winnerFaction:'village'});
  assert.equal(ack.ok,true);
  assert.equal(rows.has('drunkDeck:m-a:3:actor'),false);
  assert.equal(rows.has('drunkDeck:m-b:3:actor'),true);
  assert.equal(rows.get('history:m-a').preserve,true);
  assert.equal(rows.has('matchCompletion:m-a'),true);
});
test('actual post-game reset cleans remaining decks but not match history',async()=>{
  const {room,rows}=roomHarness();
  await room.gmReset(null,{postGame:true,preserveParticipants:true,transactionId:'test-reset'});
  assert.equal(rows.has('drunkDeck:m-a:3:actor'),false);
  assert.equal(rows.has('drunkDeck:m-b:3:actor'),false);
  assert.equal(rows.get('history:m-a').preserve,true);
  assert.equal(rows.get('meta').matchId,null);
});
