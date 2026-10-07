import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/index.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const live=fs.readFileSync('src/gmww-members-live.js','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const css=fs.readFileSync('assets/village/village.css','utf8');
const gmStyle=fs.readFileSync('server-game/current/style.css','utf8');
const gmAsset=fs.readFileSync('assets/gm/gm-white-wolf.webp');

test('GM presence API has authenticated heartbeat and public online TTL',()=>{
  assert.match(server,/GM_PRESENCE_TTL=75000/);
  assert.match(server,/\/api\/gm-presence/);
  assert.match(server,/\/api\/gm\/presence/);
  assert.match(server,/globalSetting:gmPresence/);
  assert.match(app,/gmwwSendGmPresence/);
  assert.match(app,/setInterval\(\(\)=>\{if\(document\.visibilityState!=='hidden'\)gmwwSendGmPresence\(true\)\},20000\)/);
});

test('V3.08 keeps GM in the lobby until a room is explicitly active and scopes the rider per room',()=>{
  assert.match(server,/roomCode:isValidRoomCode\(roomCode\)\?roomCode:""/);
  assert.ok(app.includes("roomCode:online!==false&&isLivePlayRoom()?String(playSceneState.roomCode||''):null"));
  assert.ok(app.includes("roomCode:isLivePlayRoom()?String(playSceneState.roomCode||''):null"));
  assert.ok(app.includes("if(saved.step==='room'){saved.roomCode='—';saved.gmToken='';saved.selectedMemberIds=[];saved.activePlayerId=''}"));
  assert.ok(live.includes("gmRoomCode===viewerRoomCode"));
});

test('Player Web renders a dedicated GM rider only while GM is online',()=>{
  assert.match(live,/GM_VILLAGE_HOLD_MS=15000/);
  assert.match(live,/GM_VILLAGE_MOVE_MS=8500/);
  assert.match(live,/avatarUrl:'\/gm\/gm-white-wolf\.webp'/);
  assert.match(live,/gmPlayer=gmVillagePlayer\(\)/);
  assert.match(village,/isGM:p\?\.isGM===true\|\|p\?\.kind==="gm"/);
  assert.doesNotMatch(village,/normalScale\\*1\\.5/);
  assert.match(village,/gmww:gm-character-click/);
  assert.match(css,/\.player\.gm/);
});

test('GM rider asset is packaged as a real WebP',()=>{
  assert.ok(gmAsset.length>10000);
  assert.equal(gmAsset.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(gmAsset.subarray(8,12).toString('ascii'),'WEBP');
});

test('GM remains visible in a full 30-player room without consuming a seat',()=>{
  assert.doesNotMatch(village,/players\.slice\(0,30\)/);
  assert.match(village,/regularCount>=30/);
  assert.match(village,/gmIncluded/);
});

test('GM can be manually steered while retaining autonomous roaming',()=>{
  assert.match(server,/\/api\/gm\/move/);
  assert.match(server,/globalGmMovePut/);
  assert.match(server,/manualUntil:now\+duration\+15000/);
  assert.match(app,/gmwwMoveGmCharacter/);
  assert.match(app,/await gmwwMoveGmCharacter\(raw\.x,raw\.y\)/);
  assert.match(app,/GMWW_GM_AUTO_HOLD_MS=15000/);
  assert.match(live,/manualUntil/);
  assert.match(live,/gm_manual/);
  assert.match(live,/setInterval\(\(\)=>\{if\(state\.member&&!document\.hidden\)refreshGmPresence\(\)\},1000\)/);
  assert.match(gmStyle,/\.play-player-token\.is-gm-rider/);
  assert.match(gmStyle,/width:56px;height:74px/);
});

test('V3.08 keeps GM rider at normal character size and animates wolf legs',()=>{
  assert.match(app,/const VERSION='3\.08'/);
  assert.match(app,/src="gm\/gm-white-wolf\.webp"/);
  assert.match(app,/activePlayerId='gm:online'/);
  assert.match(app,/gmSelected=activeId==='gm:online'/);
  assert.match(gmStyle,/\.play-player-token\.is-gm-rider\{width:72px/);
  assert.match(gmStyle,/playGmWolfLegA/);
  assert.match(gmStyle,/playGmWolfLegB/);
  assert.match(village,/baseW=compact\?50:62,baseH=compact\?67:82/);
  assert.match(css,/gmwwGmWolfLegA/);
  assert.match(css,/gmwwGmWolfLegB/);
  const prepare=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const ipa=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
  assert.match(prepare,/copyDir\('assets\/gm','gm'\)/);
  assert.match(ipa,/cp assets\/gm\/gm-white-wolf\.webp/);
});

test('V2.96 update channel preserves runtime manifest and GM rider asset for V2.94 shell',()=>{
  const prepare=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(server,/updates\/runtime\/V/);
  assert.match(server,/latestLostRuntime/);
  assert.match(prepare,/manifest\.json/);
  assert.match(deploy,/gm\/gm-white-wolf\.webp/);
});

test('GM can be steered before room creation and wolf visibly leaps instead of gliding',()=>{
  const h=app.match(/document\.getElementById\('playWorld'\)\?\.addEventListener\('click',[\s\S]*?window\.addEventListener\('resize'/)?.[0]||'';
  assert.ok(h);
  assert.doesNotMatch(h,/\|\|!isLivePlayRoom\(\)\)return/);
  assert.match(h,/gmSelected\|\|!activeId/);
  assert.match(h,/if\(!isLivePlayRoom\(\)\)return/);
  assert.match(gmStyle,/playGmWolfLeap/);
  assert.match(gmStyle,/scaleY\(1\.48\)/);
  assert.match(gmStyle,/gm-wolf-shadow/);
  assert.match(css,/gmwwGmWolfLeap/);
  assert.match(css,/scaleY\(1\.5\)/);
});

test('V3.08 update manifest bypasses stale asset cache and native download cannot point to an older IPA',()=>{
  const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(server,/UPDATE_CHANNEL_REV="runtime-308"/);
  assert.match(server,/channel="\+encodeURIComponent\(UPDATE_CHANNEL_REV\)/);
  assert.match(deploy,/Native IPA version does not match releaseVersion/);
  assert.match(deploy,/Native IPA filename is stale/);
});

test('V3.08 GM map mirrors pre-room motion and removes cyan GM wrapper',()=>{
  assert.ok(app.includes('villagePollTimer:0'));
  assert.ok(app.includes('/api/village?ts='));
  assert.ok(app.includes('playSyncGlobalVillageMotion'));
  assert.ok(app.includes('playSyncGlobalVillageMotion(false)},250)'));
  assert.ok(app.includes('serverClockOffsetMs=Number(d.serverTime)-Date.now()'));
  assert.ok(app.includes('<div class="gm-wolf-sprite"><div class="gm-wolf-shadow"></div>'));
  assert.ok(!app.includes('<span class="gm-wolf-sprite"><span class="gm-wolf-shadow">'));
  assert.ok(gmStyle.includes('.play-player-token.is-gm-rider .gm-wolf-sprite{background:transparent!important'));
});

test('V3.08 wolf uses a forward gallop, longer clear legs, and independent head life',()=>{
  assert.ok(app.includes('gm-wolf-head'));
  assert.ok(gmStyle.includes('@keyframes gmWolfForwardGallop'));
  assert.ok(gmStyle.includes('@keyframes gmWolfLongFrontStride'));
  assert.ok(gmStyle.includes('@keyframes gmWolfLongRearStride'));
  assert.ok(gmStyle.includes('@keyframes gmWolfHeadLife'));
  assert.ok(gmStyle.includes('scaleY(1.58)'));
  assert.ok(gmStyle.includes('translate(2px,-5px) rotate(-14deg)'));
});
