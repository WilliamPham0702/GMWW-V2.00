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
    assert.match(source,/missing.map\(x=>x.name\+' \('\+x.id\+'\)'\)/);
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

test('A missing-file count is an audit, not a claim that a user deleted that many files',()=>{
  const render=library.slice(library.indexOf('async function renderAudio(){'),
    library.indexOf('async function playAudioItem(',library.indexOf('async function renderAudio(){')));
  assert.match(render,/sourceStatus\(item.id\)==='missing'/);
  assert.match(render,/audioBindingStatus\(a,kind\)/);
  assert.match(render,/File thực còn thiếu/);
  assert.match(render,/Sao chép danh sách thiếu/);
});
