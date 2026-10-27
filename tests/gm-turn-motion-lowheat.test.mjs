import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const motion=readFileSync('server-game/current/gmww-shared-motion.js','utf8');
const originalPart=app.slice(app.indexOf('function playCharacterAnimationCommand('),app.indexOf('function playRigTextureUrl('));
assert.ok(originalPart.startsWith('function playCharacterAnimationCommand('),'GM animation command missing');
function command(step='battle'){
  return new Function('playSceneState','playActiveCharacterId','playWalkDirection',
    'return ('+originalPart.trim()+')')({step},id=>id||'character-01',()=> 'right');
}
const member={gameCharacterId:'character-02',characterAnimation:{facing:'right'}};

test('GM battle: actor is static canvas, target runs locally, with low power enabled',()=>{
  const fn=command();
  const actor=fn(member,{effect:'alive'});
  assert.equal(actor.state,'idle');
  assert.equal(actor.paused,true);
  assert.equal(actor.lowPower,true);
  const target=fn(member,{effect:'alive',battleTargetRunning:true});
  assert.equal(target.state,'running');
  assert.equal(target.motion,'run');
  assert.equal(target.paused,false);
  assert.equal(target.lowPower,true);
  assert.equal(target.x,undefined,'turn effects do not write player positions');
  assert.equal(target.y,undefined);
});

test('dead, frozen and expelled targets never animate; no effects outside battle',()=>{
  const fn=command();
  for(const effect of ['dead','frozen','expelled']){
    const result=fn(member,{effect,battleTargetRunning:true});
    assert.equal(result.state,'idle',effect);
    assert.equal(result.paused,true,effect);
  }
  const idleLobby=command('room')(member,{battleTargetRunning:true,effect:'alive'});
  assert.equal(idleLobby.state,'idle');
  assert.equal(idleLobby.lowPower,false);
});

test('GM-only switch, DOM selector and reduce-motion prevent unwanted visuals',()=>{
  assert.match(html,/id="battleGMTurnMotion"/);
  assert.match(app,/GMWW_GM_TURN_MOTION_V1/);
  assert.match(app,/\.classList\.toggle\('is-gm-turn-floating',floatActor\)/);
  assert.match(app,/\.classList\.toggle\('is-gm-target-running',runTarget\)/);
  assert.match(app,/prefers-reduced-motion: reduce/);
  assert.match(css,/#playShell\[data-step="battle"\]/);
  assert.match(css,/translate3d\(0,-100%,0\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('GM character atlas loop sleeps when no moving target and resumes on motion',()=>{
  assert.match(motion,/root\._gmwwLowPower=command\.lowPower===true/);
  assert.match(motion,/if\(root\._gmwwLowPower&&root\._gmwwPaused&&root\._gmwwDrawKey\)continue/);
  assert.match(motion,/\[\.\.\.roots\]\.some\(root=>root\.isConnected&&\(!root\._gmwwLowPower\|\|!root\._gmwwPaused\)\)/);
  assert.match(motion,/1000\/15/);
  assert.match(motion,/im\.onload=/);
});

test('GM bundle is derived from original six modules, not edited only in distribution',()=>{
  const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'].map(n=>readFileSync('server-game/src/'+n+'.part','utf8')).join('');
  assert.equal(parts,app);
});
