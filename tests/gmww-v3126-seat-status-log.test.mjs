import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {confirmedNightStatusVisuals,statusTagsFor} from '../src/gmww-public-room-contract.js';
const file=name=>fs.readFileSync(name,'utf8');
const ctx={};vm.runInNewContext(file('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const visualsCtx={};vm.runInNewContext(file('server-game/current/status-visuals.js'),visualsCtx);
const vis=visualsCtx.GMWW_STATUS_VISUALS;
const source=file('server-game/src/30-village-and-setup.part');
const runtime=file('server-game/current/app.js');
const village=file('assets/village/village.mjs');
const worker=file('src/index.js');
test('V3.126: twelve occupied seats use exactly 12 perimeter anchors around the campfire',()=>{
  assert.match(source,/seatCount=Math.min\(30,Math.max\(1,configured,players.length,highestSeat\)\)/);
  assert.doesNotMatch(source,/seatCount=Math.max\(playSceneRuntime.room\?\.seatLayout\?1:24/);
  const ps=layout.positions(12,'',null,100);
  assert.equal(ps.length,12);
  const uniques=new Set(ps.map(x=>Math.round(x.x*100)+','+Math.round(x.y*100)));
  assert.equal(uniques.size,12);
  for(const p of ps)assert.ok(layout.inside(p.x,p.y));
  const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);
  assert.ok(Math.min(...xs)<35&&Math.max(...xs)>65);
  assert.ok(Math.min(...ys)<42&&Math.max(...ys)>56);
  assert.match(village,/For a seated player, the authoritative seat map always wins/);
});
test('V3.126: simultaneous Bảo Vệ and Săn each get orbit icons without stacking animation loops',()=>{
  const statuses=Array.from(vis.layers(['protected','hunt','wolf_bitten']).shown);
  assert.deepEqual(statuses,['wolf_bitten','protected','hunt']);
  const html=vis.overlay(statuses);
  assert.equal((html.match(/class="gmww-sv-orbit"/g)||[]).length,1);
  for(const id of statuses)assert.ok(html.includes('data-orbit="'+id+'"'),id);
  assert.ok(html.includes('🛡️')&&html.includes('🏹')&&html.includes('🐺'));
  const meta={matchId:'m1',phase:'running',cyclePhase:'night',cycleNight:2,statusDisplay:{protected:true,hunt:true}};
  const receipts=['action_protect','action_hunt'].map(actionId=>({type:'effect_notice',loginId:'alice',
    actionId,matchId:'m1',night:2,effectActive:false,createdAt:'2026-10-17T03:00:00.000Z'}));
  const gm=confirmedNightStatusVisuals(receipts,meta);
  assert.deepEqual(gm.map(x=>x.statusId),['protected','hunt']);
  assert.deepEqual(statusTagsFor(receipts,meta,'alice').map(x=>x.statusId),['protected','hunt']);
  assert.deepEqual(statusTagsFor(receipts,{...meta,statusDisplay:{protected:true}},'alice').map(x=>x.statusId),['protected']);
  assert.deepEqual(Array.from(vis.resolveRows(gm,'alice')),['protected','hunt']);
  assert.deepEqual(confirmedNightStatusVisuals(receipts,{...meta,cyclePhase:'day'}),[]);
});
test('V3.126: GM can toggle Player Web permission offline then atomically synchronize it',()=>{
  assert.match(source,/GMWW_STATUS_DISPLAY_DRAFT_KEY/);
  assert.match(source,/playStoreStatusDisplayDraft/);
  assert.match(source,/playSyncStatusDisplayDraft/);
  assert.match(worker,/if\(type==="status_display_batch"\)/);
  assert.match(worker,/items\.length>STATUS_VISUAL_IDS\.size/);
  assert.match(source,/data-status-display/);
  const block=source.slice(source.indexOf('function renderStatusLibrary(){'),source.indexOf('document.querySelector(\'[data-lib="statuses"]\')'));
  assert.doesNotMatch(block,/\(isLive\?'':' disabled'\)/);
});
test('V3.131: action audit persists but rejected action-bar journal UI is removed',()=>{
  assert.match(worker,/actionLog:.*interaction\.id/);
  assert.match(worker,/async gmActionLog\(request\)/);
  assert.match(worker,/actionLogBackfilled/);
  assert.match(worker,/prefix:"actionLog:",reverse:true,limit:limit\+1/);
  assert.match(worker,/if\(before\)query.end=before/);
  assert.match(worker,/if\(url.pathname==="\/gm\/action-log"&&request.method==="GET"\)/);
  assert.ok((worker.match(/await this\.ctx\.storage\.put\("interactions",pruneInteractions\(rows\)\)/g)||[]).length>=8);
  assert.doesNotMatch(runtime,/playLoadActionLog\(reset=false\)/);
  assert.doesNotMatch(file('server-game/current/GMWW.html'),/playActionLog(?:Open|More|Sheet)/);
});
test('V3.126: actor status changes are local DOM patches, not expensive character remounts',()=>{
  assert.match(source,/playPlayerRenderSignature\(members\)\.split\(':status:'\)\[0\]/);
  assert.match(source,/dataset\.gmwwStatuses===sig/);
  assert.match(source,/token\.insertAdjacentHTML\('beforeend',visual\.overlay\(ids\)\)/);
  assert.match(runtime,/const VERSION='3\.133'/);
  assert.match(worker,/VERSION="V3\.133"/);
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
    '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  assert.equal(runtime,parts.map(p=>file('server-game/src/'+p)).join(''));
});
