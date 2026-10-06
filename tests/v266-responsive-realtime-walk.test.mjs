import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.66 ships 20 characters with six real frames in both directions',()=>{
  let right=0,left=0;
  for(let c=1;c<=20;c++)for(let f=1;f<=6;f++){
    const id=String(c).padStart(2,'0'),fr=String(f).padStart(2,'0');
    const rp=new URL('../assets/characters/walk-v263/character-'+id+'/frame-'+fr+'.webp',import.meta.url);
    const lp=new URL('../assets/characters/walk-v266-left/character-'+id+'/frame-'+fr+'.webp',import.meta.url);
    assert.ok(fs.statSync(rp).size>0,rp.pathname);right++;
    assert.ok(fs.statSync(lp).size>0,lp.pathname);left++;
  }
  assert.equal(right,120);assert.equal(left,120);
});

test('left walking uses raster assets and never runtime scaleX paper flipping',()=>{
  const worker=read('src/index.js'),village=read('assets/village/village.mjs'),css=read('assets/village/village.css'),app=read('server-game/current/app.js');
  assert.ok(worker.includes('walk-v266-left'));
  assert.ok(worker.includes('u.searchParams.get("dir")==="left"'));
  assert.ok(village.includes('?dir=left'));
  assert.ok(village.includes('function walkDirection(data)'));
  assert.doesNotMatch(css,/scaleX\(-1\)/);
  assert.ok(app.includes("folder=direction==='left'?'walk-v266-left':'walk-v263'"));
});

test('wide desktop fits the entire village and camera moves artwork with actors',()=>{
  const layout=read('assets/village/village-layout.js'),art=read('assets/village/village-art.css'),camera=read('assets/village/village-camera.mjs');
  assert.ok(layout.includes('function fitMode(w,h)'));
  assert.ok(layout.includes('>=.72?"contain":"cover"'));
  assert.ok(layout.includes('(mode==="contain"?Math.min:Math.max)'));
  assert.ok(art.includes('@media (min-aspect-ratio:18/25)'));
  assert.ok(art.includes('.stage::after{background-size:contain!important}'));
  assert.ok(art.includes('translate(var(--pan-x,0px),var(--pan-y,0px)) scale(var(--zoom,1))'));
  assert.ok(camera.includes('stage.style.setProperty("--zoom"'));
  assert.ok(camera.includes('stage.style.setProperty("--pan-x"'));
});

test('Player Web treats WebSocket movement as realtime and polling only as fallback',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("const movementEvent=d.type==='player_move'||d.type==='player_move_complete'"));
  assert.ok(live.includes('state.serverClockOffsetMs=Number(d.serverTime)-Date.now()'));
  assert.ok(live.includes('state.gameStateTimer=setInterval(pollRoomState,15000)'));
  assert.ok(live.includes('clockOffsetMs:Number(state.serverClockOffsetMs||0)'));
  assert.ok(live.includes("iframe.src='/village/?embed=1&v=294'"));
});

test('GM IPA consumes move WebSocket events and animates tokens with requestAnimationFrame',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes("'player_move','player_move_complete'"));
  assert.ok(app.includes('playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now()'));
  assert.ok(app.includes('requestAnimationFrame(playMovementFrame)'));
  assert.ok(app.includes("el.dataset.playPlayerId=String(m.loginId||m.participantId||'')"));
  assert.ok(app.includes('data-play-player-id'));
  assert.ok(app.includes('CSS.escape(id)'));
  assert.ok(!app.includes("setInterval(()=>{if(!playVillageMembers().some(p=>p?.movementStatus==='moving'))"));
});

test('server movement broadcasts include server time for shared interpolation clock',()=>{
  const server=read('src/index.js');
  assert.ok(server.includes('type:"player_move",room,player:publicPlayer(p),players:publicPlayers,serverTime:Date.now()'));
  assert.ok(server.includes('type:"player_move_complete",room,player:publicPlayer(p),players:publicPlayers,seatUpdated:targetSeatId?id:null,serverTime:Date.now()'));
});

test('profile is compact, keeps stats and exposes the 20-character picker',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("#profile .change-pass,#profile .profile-enter-room{display:none!important}"));
  assert.ok(live.includes("#profile .history-fold{display:block!important"));
  assert.ok(live.includes("const wins=Math.max(0,Number(m?.stats?.wins||0))"));
  assert.ok(live.includes("if(state.gameCharacters.length!==20){state.gameCharacters=[];await loadGameCharacters()}"));
  assert.ok(live.includes('#avatarLibraryModal.open{display:flex!important;pointer-events:auto!important}'));
  assert.ok(live.includes("summary.textContent='✎ THAY ĐỔI AVATAR'"));
  assert.ok(live.includes("$('#profile .profile-exit-btn,#profile .linkline button').forEach"));
});

test('IPA workflow bundles and verifies all 240 walk frames',()=>{
  const workflow=read('.github/workflows/build-server-game-ipa.yml');
  assert.ok(workflow.includes('assets/characters/walk-v266-left/character-*'));
  assert.ok(workflow.includes('$APPDIR/Web/game-characters/walk-v266-left'));
  assert.ok(workflow.includes('$APP/Web/game-characters/walk-v266-left'));
});

test('V2.66 movement contract remains packaged in the V2.87 runtime',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.00"'));
  assert.ok(app.includes("const VERSION='2.99';"));
  assert.ok(html.includes('GMWW V3.00'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 296;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.96;'));
  assert.equal(pkg.version,'3.00.0');
});
