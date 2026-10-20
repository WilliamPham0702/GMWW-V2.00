import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const catalog=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');

test('Village morning report uses only confirmed interactions from this match and night',()=>{
  const start=gm.indexOf('function battleMorningRows(){');
  const end=gm.indexOf('function battleMorningPlayAudio(){',start);
  assert.ok(start>=0&&end>start);
  const source=gm.slice(start,end)+'\nbattleMorningRows()';
  const mock={
    playSceneState:{night:2},
    playSceneRuntime:{room:{matchId:'live'},recentInteractions:[
      {type:'dead',night:2,matchId:'live',loginId:'p1',effectActive:true},
      {type:'expelled',night:2,matchId:'live',loginId:'p2',effectActive:true},
      {type:'assassin_mark',night:2,matchId:'live',loginId:'p2',effectActive:true},
      {type:'dead',night:2,matchId:'live',loginId:'p1',effectActive:false},
      {type:'dead',night:1,matchId:'live',loginId:'p3',effectActive:true},
      {type:'dead',night:2,matchId:'old',loginId:'p3',effectActive:true}
    ]},
    battleMember:id=>({p1:{displayName:'Một'},p2:{displayName:'Hai'},p3:{displayName:'Ba'}})[id]
  };
  const rows=vm.runInNewContext(source,mock);
  assert.deepEqual(Array.from(rows,r=>[r.kind,r.name]),[
    ['dead','Một'],['expelled','Hai'],['assassin_mark','Hai']
  ]);
});

test('Village morning report is draggable, dismissible outside, displays bold names and timeline glass',()=>{
  assert.ok(setup.includes('playSceneRuntime.recentInteractions=Array.isArray(data.interactions)'));
  assert.ok(html.includes('id="battleMorningReport"'));
  assert.ok(html.includes('id="battleMorningAudio"'));
  assert.ok(gm.includes("battleBindAuxiliaryDrag('battleMorningReport','header')"));
  assert.ok(gm.includes("if(morning&&!morning.hidden&&!morning.contains(target)&&!inside('#battleDayNoticeToggle'))"));
  assert.ok(gm.includes("document.createElement('strong')"));
  assert.ok(css.includes('#battleMorningReport'));
  assert.ok(css.includes('var(--gmww-stage-glass-v330)'));
});

test('Audio catalog keeps configurable death notice prefix, suffix and exact 1-5 clips',()=>{
  for(const id of ['audio_system_morning_deaths_intro','audio_system_morning_dead_noun',
    'audio_system_morning_expelled','audio_system_morning_marked'])
    assert.ok(catalog.includes(id),id);
  assert.ok(catalog.includes("Array.from({length:5}"), 'one through five are separate configurable clips');
  assert.ok(gm.includes('battleMorningPlayAudio()'));
});
