import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const app=read('server-game/current/app.js');
const steps=['lobby','room','seats','game','roles','deal','battle'];
const timelineSource=app.slice(app.indexOf('async function handlePlayTimelineStep('),app.indexOf('function initPlayScene()'));
test('V3.25 timeline replaces upper menu and all seven steps remain visible and reachable',()=>{
  assert.ok(html.indexOf('id="playSetupStrip"')<html.indexOf('id="playWorld"'));
  assert.ok(html.indexOf('id="gmTopMenu"')>html.indexOf('id="playWorld"'));
  for(const key of steps)assert.match(html,new RegExp('data-play-step="'+key+'"'));
  assert.equal((html.match(/data-play-step="/g)||[]).length,7);
  assert.doesNotMatch(html,/play-control-bar-three|id="playBack"|id="playNext"|id="playPrimaryAction"/);
  assert.match(css,/#playSetupStrip\.play-setup-strip/);
  assert.match(css,/top:calc\(env\(safe-area-inset-top\) \+ 10px\)!important/);
  assert.match(css,/bottom:calc\(env\(safe-area-inset-bottom\) \+ 10px\)!important/);
  assert.match(css,/backdrop-filter:blur\(14px\)/);
  assert.ok(app.includes("if(idx===cur)b.setAttribute('aria-current','step')"));
});
test('tapping the next timeline step uses the existing guarded phase transition',async()=>{
  const calls=[];
  const ctx={playSceneRuntime:{busy:false},playSceneState:{step:'lobby'},PLAY_STEPS:steps,
    async advancePlayPhase(){calls.push('advance')},
    async openPlayCreateRoomSheet(){calls.push('room')},
    async openPlayGameSheet(){calls.push('game')},
    async playReturnToLobby(){calls.push('reset')},
    setPlayStep(step){calls.push(step)},playFlashError(s){calls.push(s)}};
  vm.createContext(ctx);await vm.runInContext(timelineSource+'\nhandlePlayTimelineStep("room")',ctx);
  assert.deepEqual(calls,['advance']);
});
test('tapping the lobby stage from another step uses confirmed global reset',async()=>{
  const calls=[];
  const ctx={playSceneRuntime:{busy:false},playSceneState:{step:'room'},PLAY_STEPS:steps,
    async advancePlayPhase(){calls.push('advance')},
    async openPlayCreateRoomSheet(){calls.push('room')},
    async openPlayGameSheet(){calls.push('game')},
    async playReturnToLobby(){calls.push('reset')},
    setPlayStep(step){calls.push(step)},playFlashError(s){calls.push(s)}};
  vm.createContext(ctx);await vm.runInContext(timelineSource+'\nhandlePlayTimelineStep("lobby")',ctx);
  assert.deepEqual(calls,['reset']);
});
test('future stages cannot bypass room/seating/role authorization',async()=>{
  const calls=[];
  const ctx={playSceneRuntime:{busy:false},playSceneState:{step:'lobby'},PLAY_STEPS:steps,
    async advancePlayPhase(){calls.push('advance')},
    async openPlayCreateRoomSheet(){calls.push('room')},
    async openPlayGameSheet(){calls.push('game')},
    async playReturnToLobby(){calls.push('reset')},
    setPlayStep(step){calls.push(step)},playFlashError(s){calls.push('guard')}};
  vm.createContext(ctx);await vm.runInContext(timelineSource+'\nhandlePlayTimelineStep("roles")',ctx);
  assert.deepEqual(calls,['guard']);
});
