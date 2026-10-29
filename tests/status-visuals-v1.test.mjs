import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const src=read('server-game/current/status-visuals.js');
const previewRenderer=read('assets/status-visuals.js');
const previewPage=read('assets/status-visuals-preview.html');
const gmCss=read('server-game/current/status-visuals.css');
const webCss=read('assets/village/status-visuals.css');
const app=read('server-game/current/app.js');
const html=read('server-game/current/GMWW.html');
const worker=read('src/index.js');
const statusPolicy=read('src/gmww-public-room-contract.js');
const playerWeb=read('src/gmww-members-live.js');
const village=read('assets/village/village.mjs');
const villageCss=read('assets/village/village.css');
const packager=read('.github/scripts/prepare-update-channel.mjs');
const ctx={};vm.runInNewContext(src,ctx);
const vis=ctx.GMWW_STATUS_VISUALS;
test('A: catalog contains precisely 11 lasting + 5 transient effects, no rule engine',()=>{
  assert.equal(vis.entries.length,16);
  assert.deepEqual(Array.from(vis.entries.filter(x=>x.type==='persistent'),x=>x.id),['frozen','protected','wolf_bitten','marked','dead','expelled','infected','mute','disabled_permanent','linked','visited']);
  assert.deepEqual(Array.from(vis.entries.filter(x=>x.type==='instant'),x=>x.id),['recover','transform','attack','inspect','hunt']);
  assert.ok(vis.entries.every(x=>x.name&&x.description&&x.effect));
  assert.doesNotMatch(src,/playRoomApi\(|gmBattleAction\(|applyCycle\(/);
});
test('A: only active effects are drawn and disabled_2n reuses power seal',()=>{
  const rows=[
    {type:'status',statusId:'wolf_bitten',loginId:'a',effectActive:true},
    {type:'status',statusId:'disabled_2n',loginId:'a',effectActive:true},
    {type:'status',statusId:'mute',loginId:'a',effectActive:false},
    {type:'status',statusId:'infected',loginId:'a',effectActive:true,expiresAt:'2020-01-01T00:00:00Z'},
    {type:'dead',loginId:'b',effectActive:true}
  ];
  assert.equal(vis.normalize('disabled_2n'),'disabled_permanent');
  assert.deepEqual(Array.from(vis.resolveRows(rows,'a',Date.parse('2026-10-17'))),['wolf_bitten','disabled_permanent']);
  assert.deepEqual(Array.from(vis.resolveRows(rows,'b')),['dead']);
  assert.deepEqual(Array.from(vis.layers(['dead','frozen','marked']).shown),['dead']);
  assert.match(vis.overlay(['frozen','infected']),/gmww-sv-orbit/);
  assert.match(vis.overlay(['frozen','infected']),/data-orbit="infected"/);
});
test('B: library has all 16 live previews and all 16 switches',()=>{
  assert.match(html,/status-visuals\.css/);assert.match(html,/status-visuals\.js/);
  assert.match(html,/id="statusLibraryGrid"/);
  assert.match(app,/visuals\.entries\.map\(/);
  assert.match(app,/visuals\.overlay\(\[id\]\)/);
  assert.match(app,/data-status-display/);
  assert.match(app,/type:'status_display'/);
  for(const v of vis.entries)assert.ok(gmCss.includes('gmww-sv-'+v.effect));
});
test('B: server display settings are separate from game statuses',()=>{
  assert.match(statusPolicy,/STATUS_VISUAL_IDS=new Set/);
  assert.match(worker,/if\(!STATUS_VISUAL_IDS\.has\(statusId\)\)/);
  assert.match(statusPolicy,/STATUS_VISUAL_LEGACY/);
  assert.match(worker,/statusTags:statusTagsFor\(interactions,meta,p\?\.loginId,players\)/);
  assert.match(statusPolicy,/display\[x\.statusId\]===true/);
  assert.match(statusPolicy,/statusId!=="marked"/);
  assert.equal(vis.byId.marked.playerWeb,false);
});
test('C: GM actor, preview, and action box share visual state data',()=>{
  assert.match(app,/globalThis\.GMWW_STATUS_VISUALS\.overlay\(statusVisuals\)/);
  assert.match(app,/const battleActorEffects=actions\.map/);
  assert.match(app,/gmww-sv-action-tags/);
  assert.match(app,/gmww-sv-action-preview/);
  assert.match(app,/visualApi\.overlay\(\(battleActorEffects\.find/);
  assert.match(gmCss,/gmww-sv-action-preview/);
  assert.match(app,/playPlayerBlocked\(actorId\)/);
  assert.match(app,/battleRules\(\)\?\.actionsForTurn/);
});
test('C: Player Web receives status IDs and mirrors GM animation assets',()=>{
  assert.match(playerWeb,/statusTags:Array\.isArray/);
  assert.match(village,/statusId:safeText\(x\?\.statusId/);
  assert.match(village,/gmww-sv-overlay/);
  assert.match(village,/gmww-sv-badges/);
  assert.match(villageCss,/@import "\.\/status-visuals\.css\?v=3139-orbits"/);
  for(const v of vis.entries)assert.ok(webCss.includes('gmww-sv-'+v.effect));
  assert.equal(webCss.slice(0,gmCss.length),gmCss);
});
test('accessibility: labels and reduced motion are available',()=>{
  assert.match(gmCss,/prefers-reduced-motion:reduce/);
  assert.match(app,/aria-label="Hiển thị /);
  assert.match(src,/aria-hidden="true"/);
});

test('OTA: both new static dependencies are included in immutable runtime packages',()=>{
  assert.match(packager,/copy\('server-game\/current\/status-visuals\.js','status-visuals\.js'\)/);
  assert.match(packager,/copy\('server-game\/current\/status-visuals\.css','status-visuals\.css'\)/);
});

test('V1 revision: deceased player stands still surrounded by looping grey smoke (GM, library, Player Web)',()=>{
  assert.equal(vis.byId.dead.name,'Đã Chết');
  assert.equal(vis.byId.dead.type,'persistent');
  assert.equal(vis.byId.dead.effect,'gray-smoke');
  assert.match(vis.byId.dead.description,/Khói xám.*bất động/);
  assert.match(vis.overlay(['dead']),/gmww-sv-gray-smoke/);
  assert.deepEqual(Array.from(vis.layers(['dead','frozen','infected']).shown),['dead']);

  assert.match(gmCss,/\.gmww-sv-gray-smoke i/);
  assert.match(gmCss,/@keyframes gmwwSvGrayPuff/);
  assert.match(gmCss,/@keyframes gmwwSvGrayMist/);
  assert.match(gmCss,/\.play-player-token\.is-dead \.play-player-avatar\{filter:grayscale/);
  assert.match(gmCss,/\.play-player-token\.is-dead \.gmww-segmented-rig\[data-state="dead"\]/);
  assert.match(app,/moving=effect!=='dead'&&playSeatMovementActive\(m\)/);
  assert.match(app,/sitting=playSceneState\.step!=='battle'&&effect!=='dead'/);
  assert.match(webCss,/\.player\.gmww-sv-dead \.portrait\{filter:grayscale/);
  assert.match(village,/dead:"gray-smoke"/);
  assert.match(village,/function visuallyDeceased\(data\)/);
  assert.match(village,/if\(visuallyDeceased\(data\)\)continue/);
  assert.match(village,/const deceasedDisplayPoints=new Map\(\)/);
  assert.match(village,/deceasedDisplayPoints\.has\(id\)/);
  assert.match(village,/deceasedDisplayPoints\.set\(id,\{x:pos\.x,y:pos\.y\}\)/);
  assert.match(village,/deceasedDisplayPoints\.delete\(id\)/);
  assert.match(village,/const dead=visuallyDeceased\(data\),hanging=battleStatic&&!dead/);
  assert.doesNotMatch(src,/effect:'fallen'/);
  assert.doesNotMatch(gmCss,/\.gmww-sv-fallen/);
  assert.doesNotMatch(webCss,/rotate\(76deg\)/);
});

test('Preview asset: same exact 16-status renderer, no room modification, usable on iPhone',()=>{
  assert.equal(previewRenderer,src);
  assert.match(previewPage,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
  assert.match(previewPage,/\/status-visuals\.js\?v=v3139-orbits/);
  assert.match(previewPage,/\/village\/status-visuals\.css\?v=v3139-orbits/);
  assert.match(previewPage,/api\.entries\.filter/);
  assert.match(previewPage,/permissions\.get\(id\)/);
  assert.match(previewPage,/api\.overlay\(ids\)/);
  assert.match(previewPage,/active\.add\('dead'\)/);
  assert.doesNotMatch(previewPage,/fetch\(|XMLHttpRequest|localStorage\.|\/gm\/interaction|\/player\/interaction/);
});

test('V1 death immobility: pins each chibi independently and releases visual anchor on revival',()=>{
  const segment=village.match(/const deceasedDisplayPoints=new Map\(\);[\s\S]*?(?=\n  function visualPlayerPoint\()/)?.[0];
  assert.ok(segment,'Expected a pure UI movement projection');
  const factory=new Function('layout','setupState','sittingNow','spawnPosition','visuallyDeceased',segment+'; return movementPosition;');
  const interpolate=p=>({x:Number(p.moveToX)||0,y:Number(p.moveToY)||0});
  const layout={interpolate,clampPoint:(x,y)=>({x:Number(x),y:Number(y)})};
  const isDead=p=>p.statusTags?.some(x=>x.statusId==='dead')===true;
  const position=factory(layout,{clockOffsetMs:0},()=>false,()=>({x:0,y:0}),isDead);
  const dead={id:'alice',statusTags:[{statusId:'dead'}],movementStatus:'moving',moveStartedAt:1,moveDurationMs:2000,moveToX:17,moveToY:35};
  const first=position(dead,null,1000);
  assert.equal(first.x,17);assert.equal(first.y,35);
  assert.equal(first.moving,false);assert.equal(first.sitting,false);
  const serverMoved=position({...dead,moveToX:70,moveToY:81},null,4000);
  assert.equal(serverMoved.x,17,'server movement must not visually move a deceased avatar');
  assert.equal(serverMoved.y,35);
  const second=position({...dead,id:'bob',moveToX:41,moveToY:52},null,1500);
  assert.equal(second.x,41,'other players use independent anchors');
  const revived=position({id:'alice',statusTags:[],movementStatus:'idle',positionX:70,positionY:81},null,5000);
  assert.equal(revived.x,70,'reviving unlocks display movement');
  const deadAgain=position({...dead,moveToX:73,moveToY:84},null,6000);
  assert.equal(deadAgain.x,73,'new death must not reuse previous death location');
});

test('V2: all 16 visual orbit symbols, red wolf claw, and no transfer state',()=>{
  assert.equal(vis.entries.length,16);
  assert.equal(vis.byId.transfer,undefined);
  assert.equal(vis.byId.hunt.icon,'🏹');
  const expected={frozen:'❄️',protected:'🛡️',wolf_bitten:'🐺',marked:'👍',dead:'☠️',expelled:'🌪️',infected:'🦠',mute:'😷',disabled_permanent:'🚫',linked:'✌️',recover:'⭐',transform:'🥳',attack:'⚔️',inspect:'💫',hunt:'🏹',visited:'💋'};
  for(const [id,icon] of Object.entries(expected)){
    assert.match(vis.overlay([id]),/gmww-sv-orbit/);
    assert.ok(vis.overlay([id]).includes(icon),id+' missing orbit icon');
  }
  assert.match(vis.overlay(['marked']),/👎/);
  assert.match(vis.overlay(['dead']),/gmww-sv-gray-smoke/);
  assert.match(vis.overlay(['wolf_bitten']),/🐺/);
  assert.match(gmCss,/gmwwSvVerticalOrbit/);
  assert.match(gmCss,/\[data-battle-action\] \.gmww-sv-action-preview\{position:absolute;inset:0/);
  assert.match(previewPage,/function overlay\(ids\)\{return api\.overlay\(ids\)\}/);
});

test('V2 production Player Web uses the approved shared orbit renderer, not legacy visual mapping',()=>{
  assert.ok(village.includes('import "../status-visuals.js?v=v3139-orbits";'));
  assert.ok(village.includes('approvedVisuals.overlay(rows.map(x=>x.statusId))'));
  assert.ok(village.includes('if(approvedVisuals)button.insertAdjacentHTML'));
  assert.match(read('assets/village/index.html'),/visual=v3139/);
});

test('V3.124: Player Web updates overlay on same stable avatar and skips unchanged heartbeats',()=>{
  assert.match(village,/function statusVisualSignature\(data\)/);
  assert.match(village,/dataset\.gmwwStatusSig!==nextStatusSig/);
  assert.match(village,/querySelectorAll\(':scope > \.gmww-sv-overlay, \.player-over > \.gmww-sv-badges'\)/);
  assert.match(village,/button\.classList\.toggle\("gmww-sv-dead",active\.includes\("dead"\)\)/);
  assert.match(village,/if\(active\.length\)\{button\.insertAdjacentHTML\("beforeend",visuals\.overlay\(ids\)\)/);
});
test('V3.124: GM avoids continuous heavy DOM rewrites; animation and Player CSS remain identical',()=>{
  assert.match(app,/dataset\.gmwwPlayerDomSig===domSig/);
  assert.match(app,/performance\.now\(\)/);
  assert.match(app,/lastMotionPaintAt/);
  assert.match(statusPolicy,/confirmedNightStatusVisuals\(rows,meta,players=\{\}\)/);
  assert.match(worker,/confirmedNightStatusVisuals\(interactions,meta,players\)/);
  assert.match(gmCss,/content-visibility:auto/);
  assert.match(gmCss,/text-shadow:0 0 5px/);
  assert.equal(webCss.slice(0,gmCss.length),gmCss);
  assert.equal(read('server-game/current/app.js'),
    ['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
    '30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part']
     .map(x=>read('server-game/src/'+x)).join(''));
});
