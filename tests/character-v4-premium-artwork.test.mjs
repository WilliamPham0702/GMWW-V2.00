import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ARTWORK_QA_VERSION,MIN_MASTER,parseFilename,requiredKeys,validateImageMeta,
 checkCoverage,knockOutConnectedBackground
} from '../assets/characters/v4/artwork-intake-v416.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V4.16 requires original hi-res masters and every transparent bone layer',()=>{
 assert.match(ARTWORK_QA_VERSION,/4\.16/);
 assert.deepEqual(MIN_MASTER,{width:1024,height:1536});
 assert.equal(requiredKeys().length,144);
 assert.equal(new Set(requiredKeys()).size,144);
 const blank=checkCoverage([]);
 assert.equal(blank.mastersReady,0);assert.equal(blank.layersReady,0);
 assert.equal(blank.complete,false);assert.equal(blank.productionSkinEnabled,false);
 assert.equal(blank.ownerApproved,false);
 const half=checkCoverage(requiredKeys().slice(0,72));
 assert.equal(half.mastersReady,4);assert.equal(half.layersReady,68);
 assert.equal(half.complete,false);
 const full=checkCoverage(requiredKeys());
 assert.equal(full.mastersReady,8);assert.equal(full.layersReady,136);
 assert.equal(full.complete,true);
 assert.equal(full.ownerApproved,false,'coverage must not auto-approve production');
});
test('filename parser allows only 2 authorized characters / 4 directions / 17 known layers',()=>{
 assert.deepEqual(parseFilename('character-01_front.png'),{
  id:'character-01',direction:'front',layer:null,key:'character-01/front/master'
 });
 assert.equal(parseFilename('character-02_BACK_hair_back.webp').key,'character-02/back/hair_back');
 for(const name of ['character-03_front.png','character-01_top.png','character-01_left_fake.png',
  'bad.png','../character-01_front.svg','character-11_left_arm.png']){
  assert.equal(parseFilename(name),null,name);
 }
});
test('master intake refuses fake-upscaled or opaque art; accepts RGBA only',()=>{
 assert.equal(validateImageMeta({type:'image/jpeg',width:4096,height:4096,hasTransparency:true}).ok,false);
 assert.equal(validateImageMeta({type:'image/png',width:800,height:1200,hasTransparency:true}).ok,false);
 assert.equal(validateImageMeta({type:'image/png',width:1024,height:1536,hasTransparency:false}).ok,false);
 assert.equal(validateImageMeta({type:'image/png',width:1200,height:1920,hasTransparency:true}).ok,true);
 assert.equal(validateImageMeta({type:'image/webp',width:1024,height:1536,hasTransparency:true,layer:'shin_left'}).ok,true);
 assert.equal(validateImageMeta({type:'image/png',width:9000,height:9200,hasTransparency:true}).ok,false);
});
test('background matte only removes color connected to outer canvas border',()=>{
 const w=5,h=5,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  data.set([190,245,219,255],i);
 }
 // Central dark character with a same-color pixel trapped inside a closed ring
 for(let y=1;y<4;y++)for(let x=1;x<4;x++)data.set([28,40,71,255],(y*w+x)*4);
 data.set([190,245,219,255],(2*w+2)*4);
 const {pixels,removed,total}=knockOutConnectedBackground(data,w,h,{tolerance:18});
 assert.equal(removed,16);
 assert.equal(total,25);
 assert.equal(pixels[3],0,'outer background transparent');
 assert.equal(pixels[(1*w+1)*4+3],255,'art boundary preserved');
 assert.equal(pixels[(2*w+2)*4+3],255,'internal matching clothing detail preserved');
 assert.equal(data[3],255,'input data not mutated');
 assert.throws(()=>knockOutConnectedBackground(data,w,h,{tolerance:500}),/INVALID_TOLERANCE/);
});
test('staging UI is isolated from live gameplay and preserves movement rig',()=>{
 const page=read('assets/characters/v4/artwork-intake-v416.html');
 assert.match(page,/CHƯA THAY CHARACTER TRONG GAME/);
 assert.match(page,/skin-master-v415\.mjs/);
 assert.match(page,/artwork-intake-v416\.mjs/);
 assert.match(page,/type="file"/);
 assert.match(page,/MAHXh7QRhj4/);
 assert.match(page,/MAHXh6E1qMA/);
 assert.match(page,/1024×1536/);
 const studio=read('assets/characters/v4/skin-preview-v414.html');
 assert.match(studio,/9 Action/);
 const actor=read('assets/characters/v4/skeleton-rig.mjs');
 assert.match(actor,/headTiltDeg/);
 assert.doesNotMatch(read('assets/village/village.mjs'),/artwork-intake-v416/);
 assert.doesNotMatch(read('server-game/current/app.js'),/artwork-intake-v416/);
 const spec=JSON.parse(read('assets/characters/v4/skin-art-spec.json'));
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
 assert.equal(spec.deliveryGate.ownerApproved,false);
});
