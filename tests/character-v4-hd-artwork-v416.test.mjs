import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 V416_VERSION,V416_CHARACTERS,V416_VIEWS,V416_SLOTS,
 V416_MIN_SIZE,slotForFilename,validateDimensions,alphaDiagnostics,draftReviewState
} from '../assets/characters/v4/artwork-v416.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V4.16 artwork slots are exactly 2 characters × 4 real views',()=>{
 assert.match(V416_VERSION,/4\.16/);
 assert.equal(V416_CHARACTERS.length,2);
 assert.equal(V416_VIEWS.length,4);
 assert.equal(V416_SLOTS.length,8);
 assert.equal(new Set(V416_SLOTS.map(s=>s.id)).size,8);
 for(const id of ['character-01','character-02'])for(const d of ['front','left','right','back'])
  assert.ok(V416_SLOTS.some(s=>s.id===id+'-'+d));
 assert.deepEqual(V416_MIN_SIZE,{width:1024,height:1536});
});
test('PNG filename mapping only accepts known direction slots; never guesses, flips, or aliases',()=>{
 assert.equal(slotForFilename('character-01-front.png')?.id,'character-01-front');
 assert.equal(slotForFilename('character-02-right.png')?.id,'character-02-right');
 assert.equal(slotForFilename('D:\\masters\\character-02-back.png')?.id,'character-02-back');
 for(const f of ['character-03-front.png','character-01-mirrored.png','character-01-front.jpg','character-01-front.PNG.BAK'])
  assert.equal(slotForFilename(f),null,f);
});
test('transparent PNG validator enforces actual 1024x1536 master size and 2:3 aspect',()=>{
 assert.equal(validateDimensions(1024,1536).ok,true);
 assert.equal(validateDimensions(1200,1920).ok,true,'existing 5:8 V4.15 technical masters remain supported');
 assert.equal(validateDimensions(2048,3072).ok,true);
 assert.equal(validateDimensions(800,1200).error,'RESOLUTION_TOO_SMALL');
 assert.equal(validateDimensions(1024,1024).error,'RATIO_MISMATCH');
 const w=16,h=16,p=new Uint8ClampedArray(w*h*4);
 for(let y=4;y<12;y++)for(let x=4;x<12;x++)p[(y*w+x)*4+3]=255;
 assert.equal(alphaDiagnostics({width:w,height:h,data:p}).valid,true);
 p[3]=255;
 assert.equal(alphaDiagnostics({width:w,height:h,data:p}).valid,false);
 assert.throws(()=>alphaDiagnostics({width:w,height:h,data:new Uint8ClampedArray(4)}),/INVALID_IMAGE_DATA/);
});
test('source manifest acknowledges only 3 independent views and no real rig integration',()=>{
 const manifest=JSON.parse(read('assets/characters/v4/artwork-v416-manifest.json'));
 assert.equal(manifest.version,'4.16-highres-artwork-draft');
 assert.equal(manifest.drafts.length,3);
 assert.equal(new Set(manifest.drafts.map(x=>x.id+'-'+x.direction)).size,3);
 assert.ok(manifest.drafts.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.equal(manifest.limitations.requiredViews,8);
 assert.equal(manifest.limitations.importedIntoRepository,false);
 assert.equal(manifest.limitations.individualRigLayersAvailable,false);
 assert.equal(manifest.limitations.productionSkinEnabled,false);
 const state=draftReviewState(manifest.drafts.map(x=>x.id+'-'+x.direction));
 assert.deepEqual({valid:state.validSlots,total:state.totalSlots,approved:state.ownerApproved}, {valid:3,total:8,approved:false});
 assert.equal(state.allViewsReady,false);
 assert.equal(state.motionIntegrated,false);
 assert.equal(draftReviewState(V416_SLOTS.map(s=>s.id)).productionSkinEnabled,false);
});
test('web review is local browser-only; no live room, IPA, or gameplay imports',()=>{
 const page=read('assets/characters/v4/artwork-v416.html');
 for(const marker of ['type="file"','accept="image/png,.png"','artwork-v416.mjs','1024 × 1536','readLocalArtwork','storeLocalArtwork','CHƯA GẮN VÀO GAME'])assert.ok(page.includes(marker),marker);
 assert.doesNotMatch(page,/\/api\/rooms|fetch\(|\/api\/gm\//);
 assert.doesNotMatch(read('assets/village/village.mjs'),/artwork-v416/);
 assert.doesNotMatch(read('server-game/current/app.js'),/artwork-v416/);
 const spec=JSON.parse(read('assets/characters/v4/skin-art-spec.json'));
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
 assert.equal(spec.deliveryGate.ownerApproved,false);
});
