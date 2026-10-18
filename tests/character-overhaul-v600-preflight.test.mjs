import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_V600_ROSTER,CHARACTER_V600_READY,characterV600Catalog,characterV600AssetsFor,characterV600Motion,characterV600MigrateMember,characterV600AssetAudit} from '../src/gmww-character-overhaul-v600.mjs';
import {inspectGlb,inspectWebp,auditAssets} from '../tools/check-character-overhaul-v600.mjs';
test('30 completely independent assets (artwork PNG, avatar WEBP, skin GLB)',()=>{
 assert.equal(CHARACTER_V600_ROSTER.length,30);
 const paths=CHARACTER_V600_ROSTER.flatMap(c=>[c.artworkPath,c.avatarPath,c.skinPath]);
 assert.equal(new Set(paths).size,90);
 assert.ok(paths.every(p=>p.startsWith('/characters/overhaul-v600/') && !p.includes('/v253/')));
 assert.equal(paths.filter(x=>x.endsWith('/artwork.png')).length,30);
 const audit=characterV600AssetAudit(()=>false);
 assert.equal(audit.required,90);assert.equal(audit.found,0);assert.equal(audit.ready,false);
 assert.equal(CHARACTER_V600_READY,false);
 assert.equal(auditAssets().ready,false,'No valid ready-to-main asset collection is currently present');
});
test('10 muscular styles retain unchanged chibi rig and shared actions',()=>{
 const muscular=CHARACTER_V600_ROSTER.filter(c=>c.body==='muscular');
 assert.equal(muscular.length,10);
 assert.ok(muscular.every(c=>c.requiredBoneCount===16 && c.styleRule.includes('V5.83') && c.bodyProfile==='muscular-chibi'));
 const catalog=characterV600Catalog();
 assert.equal(catalog.length,30);
 assert.ok(catalog.every(c=>c.frameCount===4));
 assert.deepEqual(characterV600Motion('walking','right'),{motion:'walk',facing:'right'});
 assert.deepEqual(characterV600Motion('running','back-left'),{motion:'run',facing:'back-left'});
 assert.deepEqual(characterV600Motion('cheer','front'),{motion:'result',facing:'front'});
 assert.equal(characterV600AssetsFor('character-30').skin.endsWith('skin.glb'),true);
 assert.equal(characterV600AssetsFor('character-42'),null);
});
test('legacy characters remap appearance, not account/history/room/avatar custom',()=>{
 const old={gameCharacterId:'character-41',avatarId:'character-41',loginId:'member',stats:{wins:15},history:[{match:'m1'}],seatId:9};
 const v=characterV600MigrateMember(old);
 assert.equal(v.gameCharacterId,'character-21');
 assert.equal(v.avatarId,'character-21');
 assert.equal(v.history,old.history);assert.equal(v.stats,old.stats);assert.equal(v.seatId,9);
 const custom=characterV600MigrateMember({...old,avatarId:'custom-portrait-1'});
 assert.equal(custom.avatarId,'custom-portrait-1');
 assert.equal(custom.gameCharacterId,'character-21');
 assert.equal(old.gameCharacterId,'character-41');
});
test('reject malformed placeholder GLB and avatar from being called approved assets',()=>{
 assert.deepEqual(inspectGlb(Buffer.alloc(200)),['INVALID_GLB_2_HEADER']);
 assert.deepEqual(inspectWebp(Buffer.alloc(200)),['INVALID_WEBP']);
});
