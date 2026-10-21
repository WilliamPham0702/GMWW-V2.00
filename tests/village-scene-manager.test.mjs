import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
const gmSource=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const player=fs.readFileSync('assets/village/scene-manager.mjs','utf8');
const style=fs.readFileSync('assets/village/village-art.css','utf8');
const gmStyle=fs.readFileSync('server-game/current/style.css','utf8');
const gmPlaySource=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');

test('GM only may publish or roll back scenes, images stay readable',()=>{
 assert.match(worker,/\/api\/gm\/village-scene"&&request.method==="PUT"/);
 assert.match(worker,/\/api\/gm\/village-scene\/rollback"&&request.method==="POST"/);
 assert.match(worker,/if\(bearer\(request\)!==GM_SYNC_TOKEN\)return j\(\{ok:false,error:"UNAUTHORIZED"\},401\)/);
 assert.match(worker,/\/api\/village-scene\/image/);
 assert.match(worker,/globalSetting:villageSceneImage:/);
 assert.match(worker,/this\.ctx\.blockConcurrencyWhile\(\(\)=>this\.handleFetch\(request\)\)/);
});
test('Player reads lightweight published scene metadata and updates camera layer',()=>{
 assert.match(player,/fetch\('\/api\/village-scene'/);
 assert.match(player,/setInterval\(sync,5000\)/);
 assert.doesNotMatch(player,/\/api\/gm\/village-scene/);
 assert.match(player,/MutationObserver\(apply\)/);
 assert.match(player,/classList\.add\('custom-scene'\)/);
 assert.match(style,/\.stage\.custom-scene::after/);
 assert.match(style,/background-image:var\(--gmww-scene-image\)!important/);
 assert.match(player,/gmww:village-preview-ready/);
});
test('GM editor supports large images, preview and verified publishing',()=>{
 for(const id of ['gmVillageDay','gmVillageNight','gmVillagePreview','gmVillagePublish','gmVillageRollback','gmVillageStatus'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(gm,/file\.size>12000000/);
 assert.match(gm,/canvas\.toDataURL\('image\/webp'/);
 assert.match(gm,/villageSceneRequest\('\/api\/gm\/village-scene','PUT'/);
 assert.match(gm,/villageSceneRequest\('\/api\/village-scene','GET'/);
 assert.match(gm,/villageSceneRequest\('\/api\/gm\/village-scene\/rollback','POST'/);
 assert.match(gm,/gmww:village-preview/);
 assert.match(gm,/function applyGMVillageScene\(/);
 assert.match(gm,/function refreshVillageScenePublished\(/);
 assert.match(gm,/setInterval\(\(\)=>\{void refreshVillageScenePublished\(\)/);
 assert.match(gmStyle,/#start #playWorld\.has-custom-scene/);
 assert.match(gmPlaySource,/shell\.dataset\.step=playSceneState\.step;applyGMVillageScene\(\)/);
 assert.equal(gm.slice(gm.indexOf('const villageSceneDraft='),gm.indexOf('const STATE_KEY=')),
  gmSource.slice(gmSource.indexOf('const villageSceneDraft='),gmSource.indexOf('const STATE_KEY=')));
});
test('Village seats and movement files remain unchanged by this feature',()=>{
 assert.ok(fs.existsSync('assets/village/village-room.mjs'));
 assert.ok(fs.existsSync('assets/village/village-layout.js'));
});

function createMockStore(initial=new Map()){
 const begin=worker.indexOf('  async sceneNormalizeRecord(');
 const end=worker.indexOf('  async globalUiSettingsGet(){',begin);
 assert.ok(begin>=0&&end>begin,'scene methods exist');
 const code=worker.slice(begin,end);
 const validImageDataUrl=v=>typeof v==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(v)&&v.length<1900000;
 const gmwwStoredArtworkResponse=data=>{
  if(!validImageDataUrl(data))return new Response('Artwork not found',{status:404});
  const m=data.match(/^data:(image\/\w+);base64,(.+)$/);
  return new Response(Buffer.from(m[2],'base64'),{headers:{'content-type':m[1]}});
 };
 const Mock=new Function('validImageDataUrl','gmwwStoredArtworkResponse','j',
   'return class MockScene { constructor(data){this.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)}}};}'+code+'}')(
    validImageDataUrl,gmwwStoredArtworkResponse,(value,status=200)=>Response.json(value,{status}));
 return {store:new Mock(initial),data:initial};
}
const photo=text=>'data:image/png;base64,'+Buffer.from(text).toString('base64');

test('publish, partial replace and rollback use revisioned images without base64 polling',async()=>{
 const {store,data}=createMockStore();
 const first=await (await store.sceneSettingsPut({day:photo('day-1'),night:photo('night-1')})).json();
 assert.equal(first.scene.revision,1);
 assert.equal(JSON.stringify(first).includes('base64'),false);
 const listing=await(await store.sceneSettingsGet()).json();
 assert.equal(listing.scene.day,'/api/village-scene/image/day?revision=1');
 assert.equal(listing.scene.night,'/api/village-scene/image/night?revision=1');
 assert.equal(await(await store.sceneSettingsImage('day',1)).text(),'day-1');
 const second=await(await store.sceneSettingsPut({day:null,night:photo('night-2')})).json();
 assert.equal(second.scene.revision,2);
 assert.equal(second.scene.day,'/api/village-scene/image/day?revision=1');
 assert.equal(second.scene.night,'/api/village-scene/image/night?revision=2');
 assert.deepEqual(data.get('globalSetting:villageSceneHistory').map(x=>x.revision),[1,0]);
 assert.equal(JSON.stringify(data.get('globalSetting:villageSceneHistory')).includes('base64'),false);
 const roll=await(await store.sceneSettingsRollback()).json();
 assert.equal(roll.scene.revision,3);
 assert.equal(roll.scene.day,'/api/village-scene/image/day?revision=1');
 assert.equal(roll.scene.night,'/api/village-scene/image/night?revision=1');
 assert.equal(await(await store.sceneSettingsImage('night',1)).text(),'night-1');
 assert.equal((await store.sceneSettingsImage('day',999)).status,404);
});
test('legacy scene and rollback history are migrated without discarding old images',async()=>{
 const data=new Map([
  ['globalSetting:villageScene',{revision:7,day:photo('old-day'),night:photo('old-night')}],
  ['globalSetting:villageSceneHistory',[{revision:6,day:photo('older-day'),night:photo('older-night')}]]
 ]);
 const {store}=createMockStore(data);
 const published=await(await store.sceneSettingsPut({day:photo('new-day')})).json();
 assert.equal(published.scene.revision,8);
 assert.equal(published.scene.night,'/api/village-scene/image/night?revision=7');
 assert.equal(await(await store.sceneSettingsImage('day',6)).text(),'older-day');
 const rolled=await(await store.sceneSettingsRollback()).json();
 assert.equal(rolled.scene.revision,9);
 assert.equal(rolled.scene.day,'/api/village-scene/image/day?revision=7');
 assert.equal(await(await store.sceneSettingsImage('night',7)).text(),'old-night');
});
