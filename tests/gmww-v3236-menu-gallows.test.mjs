import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsOpen,gallowsNominate,gallowsCloseNomination,gallowsAutomaticOutcome,gallowsAutomaticNominee,gallowsBegin,gallowsSnapshot} from '../src/gmww-gallows-rules.js';
const s=p=>fs.readFileSync(p,'utf8');
const ballot=()=>({id:'test',matchId:'m',cycleKey:'day1',stage:'ready',mode:'auto',eligible:['a','b','c','d'],nominations:{},votes:{},blockedNomination:[],blockedVotes:[],nominationDurationSec:60,voteDurationSec:60});
test('V3.236 tied nomination produces no player on gallows, no voting or death',()=>{
 let g=gallowsOpen(ballot(),1000).value;
 g=gallowsNominate(g,'a','b',1100).value;
 g=gallowsNominate(g,'d','c',1200).value;
 assert.equal(gallowsAutomaticNominee(g),null);
 const close=gallowsCloseNomination(g,1300);
 assert.equal(close.ok,true);
 assert.equal(close.value.stage,'resolved');
 assert.equal(close.value.outcome,'no_lynch');
 assert.equal(close.value.candidateId,null);
 assert.equal(gallowsBegin(close.value,'b',1301).ok,false);
 const snap=gallowsSnapshot(close.value,{matchId:'m',cycleKey:'day1'},1300);
 assert.equal(snap.hanging,null);
 assert.equal(snap.outcome,'no_lynch');
});
test('V3.236 no nominations also cannot select or hang an arbitrary player',()=>{
 const v=gallowsCloseNomination(gallowsOpen(ballot(),1000).value,1200).value;
 assert.equal(v.outcome,'no_lynch');assert.equal(v.candidateId,null);
});
test('V3.236 tied save/kill votes are counted as alive, only majority kill is dead',()=>{
 const base={...ballot(),stage:'voting',candidateId:'b',votes:{a:'👍',c:'👎'}};
 assert.equal(gallowsAutomaticOutcome(base),'alive');
 assert.equal(gallowsAutomaticOutcome({...base,votes:{a:'👎',c:'👎'}}),'dead');
 assert.equal(gallowsAutomaticOutcome({...base,votes:{a:'👍',c:'👍'}}),'alive');
});
test('V3.236 campfire enters GM menu even in setup; no create-room binding',()=>{
 const source=s('server-game/src/50-roles-and-artifacts.part');
 const battle=s('server-game/src/40-battle-and-timeline.part');
 const html=s('server-game/current/GMWW.html');
 assert.match(source,/\.play-core-pearl'\)\?\.addEventListener\('click',\(\)=>battleToggleWolfMenu\(\)\)/);
 assert.match(battle,/battleToggleWolfMenu\(\)\{\s*\/\/ The campfire/);
 assert.match(battle,/dock.hidden=!visible&&!battleState.wolfOpen/);
 assert.match(html,/id="battleGMChromeToggle"/);
 assert.doesNotMatch(source,/\.play-core-pearl'\)\?\.addEventListener\('click',\(\)=>.*openPlayCreateRoomSheet/);
});
test('V3.236 explicit show/hide persists independently of touch auto-hide',()=>{
 const gm=s('server-game/src/50-roles-and-artifacts.part');
 const css=s('server-game/current/style.css');
 assert.match(gm,/const GMWW_CHROME_MENU_KEY/);
 assert.match(gm,/gmwwPlayChromeHidden=!gmwwPlayChromeHidden/);
 assert.match(gm,/setPlayGameChromeHidden\(gmwwPlayChromeHidden\)/);
 for(const id of ['playSetupStrip','gmTopMenu','playBattleTop','battleBottomControls'])assert.ok(gm.includes("'"+id+"'"));
 assert.match(css,/#playShell\.gmww-chrome-hidden/);
 assert.match(css,/#battleWolfMenu \.battle-wolf-actions\{/);
 assert.match(css,/overflow-x:auto!important/);
});
test('V3.236 62px footer SVG icons, text only for action, bare nomination number',()=>{
 const html=s('server-game/current/GMWW.html'),css=s('server-game/current/style.css'),js=s('server-game/src/40-battle-and-timeline.part');
 for(const id of ['battleDayNoticeToggle','battleDayGallowsToggle','battleUndoButton']){
  const pos=html.indexOf('id="'+id+'"');assert.ok(pos>0,id);
  assert.match(html.slice(pos,pos+550),/gmww-footer-icon/);
 }
 assert.match(css,/height:62px!important/);
 assert.match(css,/\.battle-nomination-pearl\{/);
 assert.match(css,/background:none!important/);
 assert.match(js,/countMark\.textContent=String\(count\)/);
 assert.doesNotMatch(js,/countMark\.textContent='✦ '/);
});
test('V3.236 player and GM see no-lynch public verdict; bundled sources match',()=>{
 const player=s('src/player-web-src/30-rooms-and-realtime.part');
 const js=s('server-game/src/40-battle-and-timeline.part');
 assert.match(player,/\['dead','alive','no_lynch'\]/);
 assert.match(js,/HÒA PHIẾU · KHÔNG TREO/);
 const gmParts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'];
 assert.equal(s('server-game/current/app.js'),gmParts.map(x=>s('server-game/src/'+x+'.part')).join(''));
 const webParts=['00-bootstrap-and-session','10-role-card-artwork','20-village-and-profile','30-rooms-and-realtime','40-cards-and-game','50-privacy-and-runtime'];
 assert.equal(s('src/gmww-members-live.js'),'export const gmwwMembersLiveScript = '+JSON.stringify(webParts.map(x=>s('src/player-web-src/'+x+'.part')).join(''))+';\n');
});
