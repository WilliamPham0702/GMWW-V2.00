import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/player-web-src/20-village-and-profile.part',import.meta.url),'utf8');
const excerpt=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Missing Player Web source: '+start);
  return source.slice(a,b);
};
const chars=count=>Array.from({length:count},(_,i)=>({id:'character-'+String(i+1).padStart(2,'0'),name:'Character '+(i+1)}));

test('Avatar loader accepts all 40 characters and reuses the fetched catalog',async()=>{
  const ctx={state:{gameCharacters:[]},console,gameCharacterImageUrl:id=>'/avatar/'+id,fetches:0,
    api:async path=>{assert.equal(path,'/api/game-characters');ctx.fetches++;return {characters:chars(40)}}};
  vm.runInNewContext(excerpt('async function loadGameCharacters(){','function gameCharacterFrameUrl(')+'\nthis.load=loadGameCharacters;',ctx);
  assert.equal((await ctx.load()).length,40);
  assert.equal((await ctx.load()).length,40);
  assert.equal(ctx.fetches,1,'Do not clear/reload a valid 40-character catalog');
});

test('Profile avatar picker opens for all 40 characters without making an unnecessary network request',async()=>{
  const modal={opened:false,classList:{add(){modal.opened=true}}};
  const ctx={state:{gameCharacters:chars(40),avatarPickerMode:'register',profileDraftGameCharacterId:'',
       avatarPickerDraftId:null,member:{gameCharacterId:'character-25'}},
    $:s=>s==='#avatarLibraryModal'?modal:null,
    loadGameCharacters:async()=>{throw Error('Unnecessary fetch')},
    toast:()=>{throw Error('Unexpected toast')},
    renderAvatarLibrary:()=>{},ensureCharacterPreviewTicker:()=>{}};
  vm.runInNewContext(excerpt('async function openProfileAvatarLibrary(){','window.openProfileAvatarLibrary=')+'\nthis.open=openProfileAvatarLibrary;',ctx);
  await ctx.open();
  assert.equal(modal.opened,true);
  assert.equal(ctx.state.avatarPickerMode,'profile');
  assert.equal(ctx.state.avatarPickerDraftId,'character-25');
});

test('Profile avatar picker retries when empty and reports a real outage only when no characters can be loaded',async()=>{
  let calls=0,errors=[];
  const modal={opens:0,classList:{add(){modal.opens++}}};
  const ctx={state:{gameCharacters:[],member:{gameCharacterId:'character-01'}},
    $:s=>s==='#avatarLibraryModal'?modal:null,
    loadGameCharacters:async()=>{calls++;ctx.state.gameCharacters=calls===1?[]:chars(40)},
    toast:msg=>errors.push(msg),
    renderAvatarLibrary:()=>{},ensureCharacterPreviewTicker:()=>{}};
  vm.runInNewContext(excerpt('async function openProfileAvatarLibrary(){','window.openProfileAvatarLibrary=')+'\nthis.open=openProfileAvatarLibrary;',ctx);
  await ctx.open();
  assert.equal(modal.opens,0);assert.equal(errors.length,1);
  assert.match(errors[0],/Không tải được danh sách Avatar/);
  await ctx.open();
  assert.equal(modal.opens,1);assert.equal(calls,2);
});

test('All avatar library labels use actual response count, never hardcode the obsolete 20 slots',()=>{
  assert.match(source,/sourceLabel\.textContent=state\.gameCharacters\.length\+' Nhân Vật Động'/);
  assert.match(source,/libraryBtn\.textContent='XEM ĐỦ '\+state\.gameCharacters\.length\+' NHÂN VẬT'/);
  assert.match(source,/catalog\.length\+' Nhân vật GMWW'/);
  assert.doesNotMatch(source,/length[!=]==?20|Chưa tải được 20 Avatar động|XEM ĐỦ 20 NHÂN VẬT/);
});

test('The browser and API use the same new portrait revision for avatar selection, profile and village actor',()=>{
  assert.match(source,/function gameCharacterFrameUrl\(id,frame=1\)/);
  assert.match(source,/\/image\?rev=c40-4/);
  assert.match(source,/function avatarButton\(a\)/);
  assert.match(source,/i\.src=gameCharacterImageUrl\(a\.id\)/);
  assert.match(source,/const main=\$\('#profileAvatar'\)/);
  const catalog=readFileSync(new URL('../src/gmww-character40-catalog.js',import.meta.url),'utf8');
  assert.match(catalog,/CHARACTER40_PORTRAIT_REV='c40-4'/);
  assert.match(catalog,/u\.pathname='\/characters\/gmww40\/originals\/'\+visual/);
  const generator=readFileSync(new URL('../tools/generate-character40-portraits.py',import.meta.url),'utf8');
  assert.match(generator,/FRAME_INDEX = 8/);
  assert.match(generator,/lossless=True/);
  assert.match(generator,/len\(rows\) != 40/);
});
