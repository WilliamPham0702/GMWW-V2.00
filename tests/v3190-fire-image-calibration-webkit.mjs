// V3.190 iPhone WebKit: actual GM Day/Night uploaded scene fire calibration.
// Isolated browser harness; no real room, user or Production mutations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webkit} from 'playwright';
const gm=readFileSync('server-game/current/app.js','utf8');
const engine=readFileSync('src/index.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const start=gm.indexOf('function villageFirePosition(){');
const end=gm.indexOf('function preloadGMVillageScene(src){',start);
assert.ok(start>=0&&end>start,'Read calibrated fire functions from shipped GM runtime');
assert.ok(html.includes('id="gmVillageFireDay"')&&html.includes('id="gmVillageFireNight"'));
assert.ok(css.includes('background-size:100% 100%!important'));
assert.match(engine,/if\(\(body\.fireAnchors\|\|body\.gallowsAnchors\)\&\&!body\.day\&\&!body\.night\)/,'fire/gallows anchor-only saves preserve existing image bytes');
assert.match(engine,/gallowsAnchors:\{\.\.\.previous\.gallowsAnchors,\.\.\.body\.gallowsAnchors\}/,'gallows position persists as a separate landmark');
const src=gm.slice(start,end);
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.route('https://gm-fire-qa.test/**',r=>r.fulfill({status:200,contentType:'text/html',
   body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="playWorld" style="position:fixed;inset:0;background:#071825 center/100% 100% no-repeat"></div></body></html>'}));
 await page.goto('https://gm-fire-qa.test/');
 // A valid tiny transparent PNG, independent of runtime's live imported assets.
 const tiny='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
 await page.addScriptTag({content:`
  const playSceneState={phase:'night'},villageSceneDraft={day:null,night:null},
    villageSceneDraftAnchors={day:null,night:null};
  let villageScenePublished={revision:1,day:'/night/day',night:'/night/night',fireAnchors:{}};
  let villageLocalSnapshot={images:{day:'${tiny}',night:'${tiny}'}};
  const global=window;global.GMWW_VILLAGE_LAYOUT={fire:{x:50,y:64}};
  const playMapDisplay=(x,y)=>[x,y];
  const villageSceneStatus=message=>window.__status=message;
  const playFlashError=message=>window.__error=message;
  let renderCount=0;const renderPlayScene=()=>{renderCount++};
  window.__requests=[];
  async function villageSceneRequest(path,method,payload){
    window.__requests.push({path,method,payload});
    return {scene:{...villageScenePublished,revision:villageScenePublished.revision+1,
      fireAnchors:{...villageScenePublished.fireAnchors,...payload.fireAnchors}}};
  }
  async function setGMVillageScenePublished(next){villageScenePublished=next}
  ${src}
  window.__fire={
    position:villageFirePosition,calibrate:villageCalibrateFire,
    setPhase:x=>{playSceneState.phase=x},
    setDraft:(k,x)=>{villageSceneDraft[k]=x},
    getDraft:()=>({...villageSceneDraftAnchors}),
    published:()=>villageScenePublished,
    clear:()=>{villageScenePublished={revision:2,day:null,night:null,fireAnchors:{}}}
  };`});
 assert.deepEqual(await page.evaluate(()=>__fire.position()),[50,50],
   'Custom image with no calibrated landmark must not use legacy GP2 fire y=64%');
 // The reported screenshot puts campfire at about the middle of the full frame.
 await page.evaluate(()=>__fire.calibrate('night'));
 const picker=page.locator('#gmFirePicker');
 assert.equal(await picker.isVisible(),true);
 await page.mouse.click(195,420);
 await page.waitForFunction(()=>window.__requests.length===1);
 const night=await page.evaluate(()=>({position:__fire.position(),saved:__fire.published(),write:__requests[0],status:window.__status,error:window.__error}));
 assert.ok(Math.abs(night.position[0]-50)<1&&Math.abs(night.position[1]-49.76)<1,'Calibrated nighttime marker uses actual touch coordinates');
 assert.deepEqual(Object.keys(night.write.payload).sort(),['expectedRevision','fireAnchors']);
 assert.deepEqual(Object.keys(night.write.payload.fireAnchors),['night']);
 assert.equal(night.saved.revision,2);
 assert.equal(night.error,undefined);
 // A different imported Day picture has its OWN independent anchor, not the night spot.
 await page.evaluate((data)=>__fire.setDraft('day',data),tiny);
 await page.evaluate(()=>__fire.calibrate('day'));
 await page.mouse.click(156,354);
 const day=await page.evaluate(()=>({draft:__fire.getDraft(),count:__requests.length,phase:__fire.position()}));
 assert.ok(Math.abs(day.draft.day.x-40)<1&&Math.abs(day.draft.day.y-42)<1);
 assert.equal(day.count,1,'Calibrating an uncommitted image must not mutate Server');
 assert.deepEqual(day.phase,night.position,'Night remains unchanged by a Day draft');
 // Cancel must never commit; each marker can be placed exactly per scene.
 await page.evaluate(()=>__fire.calibrate('day'));await picker.locator('button').click();
 assert.equal(await page.evaluate(()=>__requests.length),1);
 await page.evaluate(()=>__fire.clear());
 assert.deepEqual(await page.evaluate(()=>__fire.position()),[50,64],
   'Unmodified bundled GP2 village keeps its original fire layout');
 console.log('PASS WebKit V3.190: screenshot repro, Day/Night markers, touch and metadata-only persistence');
}finally{await browser.close()}
