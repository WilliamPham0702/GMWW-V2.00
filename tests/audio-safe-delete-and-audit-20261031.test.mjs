import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const library=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('Audio rows have a single title only; detailed file audits remain in the summary',()=>{
  for(const source of [library,app]){
    const from=source.indexOf('resolved.map(({a,status,nameStatus})=>{');
    const end=source.indexOf("    }).join('');",from);
    assert.ok(from>=0&&end>from);
    const row=source.slice(from,end);
    assert.doesNotMatch(row,/<small/,'No file/status subtitles beneath audio names');
    assert.match(row,/<b>['"]?\+esc\(a.name\)/);
    assert.match(row,/data-audio-name-play/);
    assert.match(row,/data-audio-play/);
    assert.match(row,/data-audio-replace/);
    assert.match(row,/data-audio-delete/);
    assert.match(source,/id="audioMissingReport"/);
    assert.match(source,/noFullLink.map\(x=>x.name\+' \('\+x.id\+'\)'\)/);
  }
});

test('Accidental deletion does nothing when GM cancels confirmation',async()=>{
  const source=library.slice(library.indexOf('// Deleted audio rows are recoverable.'),
    library.indexOf('function bindCore(){'));
  const row={id:'audio_card_role_guard',targetId:'role_guard',name:'Bảo Vệ',fileName:'guard.mp3'};
  const state={audio:{cards:[row]},audioTrash:[]};
  let invalidated=0,saved=0,rendered=0,prompt='';
  const ctx={state,audioKind:'cards',document:{},Date,
    confirm:s=>{prompt=s;return false},
    clone:a=>JSON.parse(JSON.stringify(a)),
    battleInvalidateAudioCache:()=>invalidated++,
    saveState:()=>saved++,
    renderAudio:()=>rendered++};
  vm.runInNewContext(source+';globalThis.removeAudio=deleteAudioItem;',ctx);
  await ctx.removeAudio(row);
  assert.equal(state.audio.cards.length,1);
  assert.equal(state.audioTrash.length,0);
  assert.equal(saved,0);
  assert.equal(rendered,0);
  assert.equal(invalidated,0);
  assert.match(prompt,/HỦY/);
});

test('Confirmed deletion puts row into reversible trash without deleting either original file',async()=>{
  const source=library.slice(library.indexOf('// Deleted audio rows are recoverable.'),
    library.indexOf('function bindCore(){'));
  const row={id:'audio_card_role_guard',targetId:'role_guard',name:'Bảo Vệ',
    fileName:'guard.mp3',nameFileName:'guard-name.mp3',nameUrl:'https://example.test/name.mp3'};
  const state={audio:{cards:[row]},audioTrash:[]};
  const invalidated=[],ctx={state,audioKind:'cards',document:{},Date,
    confirm:()=>true,clone:a=>JSON.parse(JSON.stringify(a)),
    battleInvalidateAudioCache:(kind,id)=>invalidated.push(kind+':'+id),
    saveState:()=>{},renderAudio:()=>{}};
  vm.runInNewContext(source+';globalThis.removeAudio=deleteAudioItem;',ctx);
  await ctx.removeAudio(row);
  assert.equal(state.audio.cards.length,0);
  assert.equal(state.audioTrash.length,1);
  assert.equal(state.audioTrash[0].kind,'cards');
  assert.deepEqual(JSON.parse(JSON.stringify(state.audioTrash[0].item)),row);
  assert.deepEqual(invalidated,['cards:audio_card_role_guard','cards-name:audio_card_role_guard']);
  assert.doesNotMatch(source,/dbDelete\s*\(/,'No file bytes may be deleted by this feature');
  assert.match(source,/gmwwOpenAudioTrash\(/);
  assert.match(source,/Object\.assign\(current,item\)/);
  assert.match(source,/list\.unshift\(clone\(item\)\)/);
});


test('Role Audio audit is by role link, not missing physical files',()=>{
  const render=library.slice(library.indexOf('async function renderAudio(){'),
    library.indexOf('async function playAudioItem(',library.indexOf('async function renderAudio(){')));
  assert.match(render,/noFullLink=roles.filter/);
  assert.match(render,/noNameLink=roles.filter/);
  assert.match(render,/gmwwRoleAudioIsLinked\(role,resolved,'full'\)/);
  assert.match(render,/gmwwRoleAudioIsLinked\(role,resolved,'name'\)/);
  assert.match(render,/data-role-link-id/);
  assert.match(render,/data-role-link-slot/);
  assert.match(render,/gmwwOpenRoleAudioReplace\(a\)/);
  assert.match(render,/Sao chép danh sách Vai Trò chưa gắn Audio/);
  assert.match(render,/KHÔNG kiểm tra tệp thực có tồn tại/);
});

test('Name and Full links count independently, even if saved file bytes are missing',()=>{
  const source=library.slice(library.indexOf('function gmwwRoleAudioIsLinked('),
    library.indexOf('async function renderAudio(){'));
  assert.ok(source.startsWith('function gmwwRoleAudioIsLinked('));
  const ctx={};
  vm.runInNewContext(source+';globalThis.isLinked=gmwwRoleAudioIsLinked;',ctx);
  const role={id:'role_guard',name:'Bảo Vệ'};
  const unrelated={id:'role_wolf',name:'Sói Thường'};
  const savedFile=[{a:{targetId:role.id,fileName:'guard.mp3'},
    status:'missing',nameStatus:'missing'}];
  assert.equal(ctx.isLinked(role,savedFile,'full'),true);
  assert.equal(ctx.isLinked(role,savedFile,'name'),false);
  assert.equal(ctx.isLinked(unrelated,savedFile,'full'),false);
  const empty=[{a:{targetId:role.id,fileName:'',nameFileName:'',url:'',nameUrl:''},
    status:'missing',nameStatus:'missing'}];
  assert.equal(ctx.isLinked(role,empty,'full'),false);
  assert.equal(ctx.isLinked(role,empty,'name'),false);
  const remote=[{a:{targetId:role.id,url:'https://example.test/full.mp3',
    nameUrl:'https://example.test/name.mp3'},status:'remote',nameStatus:'remote'}];
  assert.equal(ctx.isLinked(role,remote,'full'),true);
  assert.equal(ctx.isLinked(role,remote,'name'),true);
  const bundled=[{a:{targetId:role.id,sourceKey:'ROLE:source-18'},
    status:'missing',nameStatus:'missing'}];
  assert.equal(ctx.isLinked(role,bundled,'full'),true);
  assert.equal(ctx.isLinked(role,bundled,'name'),false);
});

test('iPhone audio panel binds Play Tên, Play Full, Thay thế, Xóa, and every Gắn Audio button',async()=>{
  const source=library.slice(library.indexOf('function gmwwRoleAudioIsLinked('),
    library.indexOf('async function playAudioItem(',library.indexOf('function gmwwRoleAudioIsLinked(')));
  const roles=[{id:'role_guard',name:'Bảo Vệ'},{id:'role_wolf',name:'Sói Thường'}];
  const audio=roles.map(role=>({id:'audio_'+role.id,targetId:role.id,name:role.name,fileName:'',nameUrl:''}));
  const tapped=[],linked=[],links=[],rows=[];
  const mkButton=()=>({onclick:null,listeners:{},addEventListener(kind,fn){this.listeners[kind]=fn}});
  const grid={
    html:'',
    set innerHTML(html){
      this.html=html;
      const matched=[...html.matchAll(/data-role-link-id="([^"]+)" data-role-link-slot="(name|full)"/g)];
      for(const match of matched){
        const button=mkButton();
        button.dataset={roleLinkId:match[1],roleLinkSlot:match[2]};
        links.push(button);
      }
      for(const a of audio){
        const buttons={
          '[data-audio-play]':mkButton(),
          '[data-audio-name-play]':mkButton(),
          '[data-audio-replace]':mkButton(),
          '[data-audio-delete]':mkButton()
        };
        rows.push({dataset:{audioId:a.id},querySelector:s=>buttons[s]??null,buttons});
      }
    }
  };
  const missingReport=mkButton(),addBox=mkButton();
  const doc={
    querySelector(s){return {'#audioGrid':grid,'#audioMissingReport':missingReport,
      '#addAudioBox':addBox}[s]??null},
    querySelectorAll(s){return s==='#audioGrid [data-role-link-id]'?links:
      s==='[data-audio-id]'?rows:[]}
  };
  const ctx={document:doc,navigator:{},state:{audio:{cards:audio},cards:roles,audioTrash:[]},
    audioKind:'cards',audioBindingStatus:async()=> 'missing',gmwwRoleNameAudioStatus:async()=> 'missing',
    audioHasFile:async()=>false,esc:x=>String(x),uid:()=>'',saveState:()=>{},
    playAudioItem:(...args)=>tapped.push(['play',...args]),
    gmwwOpenRoleAudioReplace:a=>tapped.push(['replace',a]),
    deleteAudioItem:a=>tapped.push(['delete',a]),
    replaceAudioItem:()=>{},playFlashError:()=>{}};
  ctx.$=(s,r=doc)=>r.querySelector(s);
  ctx.$$=(s,r=doc)=>Array.from(r.querySelectorAll(s));
  vm.runInNewContext(source+';globalThis.render=renderAudio;',ctx);
  await ctx.render();
  assert.ok(links.length>=4,'Each missing Name and Full slot has a Gắn Audio button');
  assert.equal(rows.length,2);
  assert.equal(typeof rows[0].buttons['[data-audio-play]'].onclick,'function');
  assert.equal(typeof rows[0].buttons['[data-audio-name-play]'].listeners.click,'function');
  assert.equal(typeof rows[0].buttons['[data-audio-replace]'].onclick,'function');
  assert.equal(typeof rows[0].buttons['[data-audio-delete]'].onclick,'function');
  rows[0].buttons['[data-audio-play]'].onclick();
  rows[0].buttons['[data-audio-name-play]'].listeners.click();
  rows[0].buttons['[data-audio-replace]'].onclick();
  rows[0].buttons['[data-audio-delete]'].onclick();
  links[0].onclick();
  assert.deepEqual(tapped.map(x=>x[0]),['play','play','replace','delete','replace']);
  assert.equal(tapped[0][2],'cards');
  assert.equal(tapped[0][3],'full');
  assert.equal(tapped[1][3],'name');
  assert.ok(grid.html.includes('Đối chiếu liên kết Audio Vai Trò'));
});
