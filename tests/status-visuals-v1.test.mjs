import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const src=read('server-game/current/status-visuals.js');
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
test('A: catalog contains precisely 10 lasting + 5 transient effects, no rule engine',()=>{
  assert.equal(vis.entries.length,15);
  assert.deepEqual(Array.from(vis.entries.filter(x=>x.type==='persistent'),x=>x.id),['frozen','protected','wolf_bitten','marked','dead','expelled','infected','mute','disabled_permanent','linked']);
  assert.deepEqual(Array.from(vis.entries.filter(x=>x.type==='instant'),x=>x.id),['recover','transform','attack','inspect','transfer']);
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
  assert.match(vis.overlay(['frozen','infected']),/gmww-sv-snowfall/);
  assert.match(vis.overlay(['frozen','infected']),/gmww-sv-green-rain/);
});
test('B: library has all 15 live previews and all 15 switches',()=>{
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
  assert.match(worker,/statusTags:statusTagsFor\(interactions,meta,p\?\.loginId\)/);
  assert.match(statusPolicy,/display\[x\.statusId\]===true/);
  assert.match(worker,/statusId!=="marked"/);
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
  assert.match(villageCss,/@import "\.\/status-visuals\.css"/);
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
  assert.match(app,/moving=effect!=='dead'&&m\?\.movementStatus/);
  assert.match(app,/sitting=effect!=='dead'/);
  assert.match(webCss,/\.player\.gmww-sv-dead \.portrait\{filter:grayscale/);
  assert.match(village,/dead:"gray-smoke"/);
  assert.match(village,/function visuallyDeceased\(data\)/);
  assert.match(village,/if\(visuallyDeceased\(data\)\)continue/);
  assert.match(village,/const dead=visuallyDeceased\(data\),moving=!dead/);
  assert.doesNotMatch(src,/effect:'fallen'/);
  assert.doesNotMatch(gmCss,/\.gmww-sv-fallen/);
  assert.doesNotMatch(webCss,/rotate\(76deg\)/);
});
