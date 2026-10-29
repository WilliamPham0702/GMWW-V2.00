import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const start=source.indexOf('function updatePlayerTopMenu(){');
const end=source.indexOf('/* Private mini cards',start);
assert.ok(start>=0&&end>start,'Player account menu updater must exist');

function setup(characterId=''){
  const classes=new Set();
  const avatar={dataset:{},hidden:true,removed:[],removeAttribute(name){this.removed.push(name);delete this[name]}};
  const account={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},querySelector:selector=>selector==='img'?avatar:null};
  const menu={hidden:false,querySelector:selector=>selector==='.gmww-player-menu-account'?account:null};
  const state={member:{gameCharacterId:characterId},participantId:null,room:null,audioCue:null};
  const ctx={$:selector=>selector==='#gmwwPlayerTopMenu'?menu:null,
    state,currentRoomPlayer:()=>null,playerTopMenuStatus:()=> 'SẢNH CHỜ',
    playerScenePolicy:()=>({mode:'lobby'}),gameCharacterImageUrl:id=>'/api/game-characters/'+id+'/image'};
  vm.runInNewContext(source.slice(start,end)+';this.update=updatePlayerTopMenu;',ctx);
  return {ctx,avatar,account,menu,classes};
}
test('Top-right account icon has a built-in SVG, and unloaded images cannot expose Safari question-mark placeholders',()=>{
  assert.match(source,/class="gmww-player-account-fallback"/);
  assert.match(source,/alt="Avatar nhân vật của bạn" hidden/);
  assert.match(source,/#gmwwPlayerTopMenu \.gmww-player-menu-account img\[hidden\]\{display:none!important\}/);
  assert.match(source,/\.gmww-player-menu-account\.has-avatar \.gmww-player-account-fallback\{display:none!important\}/);
  const {ctx,avatar,classes}=setup();
  ctx.update();
  assert.equal(avatar.hidden,true);
  assert.equal(classes.has('has-avatar'),false);
  assert.equal(avatar.src,undefined);
});
test('Account avatar appears only after loading and falls back if the image request fails',()=>{
  const {ctx,avatar,classes}=setup('character-07');
  ctx.update();
  assert.equal(avatar.src,'/api/game-characters/character-07/image');
  assert.equal(avatar.hidden,true);
  assert.equal(classes.has('has-avatar'),false);
  avatar.onload();
  assert.equal(avatar.hidden,false);
  assert.equal(classes.has('has-avatar'),true);
  avatar.onerror();
  assert.equal(avatar.hidden,true);
  assert.equal(classes.has('has-avatar'),false);
  assert.equal(avatar.src,undefined);
  ctx.update();
  assert.equal(avatar.src,undefined,'Do not retry broken thumbnail on every lobby render');
  ctx.state.member.gameCharacterId='character-12';
  ctx.update();
  assert.equal(avatar.src,'/api/game-characters/character-12/image','Changing Character retries with new avatar');
});
test('Menu avatar is static: no animated image preview timer or per-frame fetches',()=>{
  const section=source.slice(start,end);
  assert.doesNotMatch(section,/ensureCharacterPreviewTicker\(\)/);
  assert.doesNotMatch(section,/dataset\.gmwwWalkCharacter\s*=/);
  assert.match(section,/removeAttribute\('data-gmww-walk-character'\)/);
});
