import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const roster=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const controls=fs.readFileSync('server-game/current/battle-controls.js','utf8');

test('wolf introduction action box lists member names without extra explanation',()=>{
  assert.ok(src.includes("?(t.recognitionIds||[]).map"));
  assert.doesNotMatch(src,/Bầy Sói nhận biết nhau:/);
});

test('roster confirmation controls are near select all, bulk selection requires three clicks',()=>{
  const toolbar=html.indexOf('id="playRosterSelectAll"'),cancel=html.indexOf('id="playRosterCancel"'),
    confirm=html.indexOf('id="playRosterSave"'),filter=html.indexOf('id="playRosterFilters"');
  assert.ok(toolbar>=0&&cancel>toolbar&&confirm>cancel&&filter>confirm);
  assert.equal(html.split('id="playRosterSave"').length-1,1);
  assert.match(roster,/playRosterBulkConfirmClicks<3/);
  assert.ok(roster.includes('playRosterBulkSelection=!!rows.length&&!all'));
  assert.ok(roster.includes('playRosterBulkSelection=false;playRosterResetBulkConfirmation()'));
});

test('disabled daytime Artifact shows its configured action and preserves role actions',()=>{
  const sandbox=vm.createContext({});vm.runInContext(controls,sandbox);
  const engine=sandbox.GMWW_BATTLE_CONTROLS;
  const catalog={
    cards:[{id:'witch',name:'Phù Thuỷ Già',functions:[
      {actionId:'save',name:'Cứu',phase:'night',targetCount:1},
      {actionId:'kill',name:'Giết',phase:'night',targetCount:1}]}],
    artifacts:[{id:'stone',name:'Đá Hoán Đổi',functions:[
      {actionId:'swap',phase:'day',targetCount:2}],actions:[
      {id:'swap',name:'Hoán Đổi Vai Trò'}]}],
    actions:[]
  };
  const turn={kind:'role',roleId:'witch',loginIds:['dung'],
    artifacts:[{artifactId:'stone',loginId:'dung',artifactName:'Đá Hoán Đổi'}]};
  const result=engine.actionsForTurn(turn,1,catalog);
  assert.deepEqual(Array.from(result,x=>x.name),['Cứu','Giết','Hoán Đổi Vai Trò']);
  assert.equal(result[2].unavailable,true);
  assert.match(result[2].unavailableReason,/ban ngày/);
  assert.equal(result.filter(x=>x.artifactId).length,1);
});

test('generated GM runtime retains exact source assembly',()=>{
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
    '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  assert.equal(app,parts.map(n=>fs.readFileSync('server-game/src/'+n,'utf8')).join(''));
});


test('Artifact foot label is compact and swipeable while preserving full name access',()=>{
  const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  assert.match(setup,/play-player-artifact-text/);
  assert.match(setup,/title=".*playEsc\\(assignment\\.artifactName/);
  assert.match(css,/\\.play-player-artifact \\.play-player-artifact-text\\{/);
  assert.match(css,/width:2em!important/);
  assert.match(css,/overflow-x:auto!important/);
  assert.match(css,/touch-action:pan-x!important/);
});

test('GM action tray remains one row, arrows expose overflow, buttons retain drag',()=>{
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  assert.match(html,/id="battleActionRail"/);
  assert.match(html,/id="battleActionPrevious"/);
  assert.match(html,/id="battleActionNext"/);
  assert.match(src,/function battleUpdateActionNavigation\\(/);
  assert.match(src,/function battleNavigateActions\\(direction\\)/);
  assert.match(src,/bar\\.scrollBy\\(\\{left:direction\\*amount/);
  assert.match(src,/scroll',battleUpdateActionNavigation/);
  assert.match(css,/#battleActionRail\\.battle-action-rail/);
  assert.match(css,/flex-direction:row!important;flex-wrap:nowrap!important/);
  assert.match(css,/scrollbar-width:none!important/);
  assert.match(src,/battleState\\.drag=\\{id:x\\.dataset\\.battleAction/);
});
