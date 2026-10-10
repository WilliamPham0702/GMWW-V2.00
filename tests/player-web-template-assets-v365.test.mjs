import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const player=patchPrivatePlayerCards(gmwwMembersLiveScript);

test('Player uses GM-equivalent artwork, role name, faction and source information',()=>{
 assert.doesNotThrow(()=>new vm.Script(player));
 assert.match(player,/function renderGMWWPlayerCardFace\(kind\)/);
 assert.match(player,/const information=String\(pc\.information\?\?data\.description/);
 assert.match(player,/gmwwPlayerUnifiedCard/);
 assert.match(player,/grid-template-rows:8fr 1fr 3fr/);
 assert.match(player,/object-fit:contain/);
 assert.doesNotMatch(player,/<span class="mini-label"><b>VAI TRÒ<\/b><small>CHẠM ĐỂ XEM<\/small><\/span>/);
 assert.doesNotMatch(player,/<span class="mini-label"><b>ARTIFACT<\/b><small>CHẠM ĐỂ XEM<\/small><\/span>/);
 assert.match(player,/#gmwwPlayerPrivateDock \.mini-label\{display:block!important;[^}]*background:none!important/);
});
test('One click anywhere closes a card; both keep 30-second idle timeout',()=>{
 assert.match(player,/document\.addEventListener\('click',event=>\{if\(\$\('#game'\)\?\.dataset\.privateCardView!=='open'\)return/);
 assert.match(player,/event\.preventDefault\(\);event\.stopImmediatePropagation\(\);closePrivateCardViewer\(\)/);
 assert.match(player,/renderGMWWPlayerCardFace\(kind\)/);
 assert.match(player,/PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
 assert.doesNotMatch(player,/btn\.textContent='← ÚP LÁ · VỀ LÀNG'/);
});
test('Saving a template persists verified artwork and versioned asset metadata on server',()=>{
 assert.match(worker,/async gameTemplateAssetsStatus\(rawId\)/);
 assert.match(worker,/async gameTemplateAssetPut\(body\)/);
 assert.match(worker,/async gameTemplateAssetGet\(rawId,rawAsset\)/);
 assert.match(worker,/Number\(row\.revision\)!==Number\(rec\.revision\)/);
 assert.match(app,/await playEnsureTemplateAssets\(String\(cached\?\.template\?\.id\|\|templateId\)/);
 assert.match(app,/const imageDataUrl=isArtifact\?await playArtifactArtworkData/);
 assert.match(app,/createImageBitmap\(blob\)/);
 assert.match(app,/canvas\.getContext\('2d',\{alpha:false\}\)/);
 assert.match(app,/reduced\.size<=maxBytes/);
 assert.match(app,/resolveArtwork\(kind,id,'display'\)/);
 assert.match(app,/if\(!status\?\.ready\)throw new Error/);
});
test('Room is preloaded at Phân Vai and Phát Vai never attempts unverified image upload',()=>{
 assert.match(app,/await playEnsureTemplateAssets\(id,base\)/);
 assert.match(app,/await playRoomApi\('\/template-assets'/);
 assert.match(app,/await playPreloadSelectedArtwork\(configured\)/);
 const deal=app.slice(app.indexOf('async function playDealRoles(){'),app.indexOf('function selectPlayWinner(',app.indexOf('async function playDealRoles(){')));
 assert.match(deal,/await playRoomApi\('\/artwork-manifest'/);
 assert.match(deal,/expected\.every\(id=>manifest\?\.assetIds\?\.includes\(id\)\)/);
 assert.doesNotMatch(deal,/playRoleArtworkData\(/);
 assert.doesNotMatch(deal,/playArtifactArtworkData\(/);
 assert.match(deal,/await playRoomApi\('\/assignments'/);
 assert.match(worker,/ROOM_ARTWORK_VERIFY_FAILED/);
 assert.match(worker,/Artwork is not released/);
 assert.match(worker,/\['role_delivery','running','started','game','playing'\]\.includes/);
});
test('All time inputs display their seconds unit in the label',()=>{
 assert.match(html,/Thời gian thảo luận \(giây\):/);
 assert.match(html,/Thời gian sử dụng Vai Trò \(giây\):/);
 assert.match(html,/Thời gian sử dụng Artifact \(giây\):/);
 assert.ok(app.includes("playEsc(role.name||'Vai Trò')+' (giây):</span>"));
 assert.doesNotMatch(html,/<small>giây<\/small>/);
});
