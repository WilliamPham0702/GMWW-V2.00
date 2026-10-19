import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const url=process.env.CHARACTER40_URL||'http://127.0.0.1:18782/';
for(const [name,type,viewport] of [['chromium',chromium,{width:1280,height:900}],['webkit',webkit,{width:390,height:844}]]){
 const browser=await type.launch();const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__CHARACTER40_REPORT?.loaded);
 await page.locator('#travel').uncheck();await page.locator('#pause').click();
 for(let n=1;n<=40;n++){
   const id=`character-${String(n).padStart(2,'0')}`;await page.locator('#character').selectOption(id);
   await page.waitForFunction(id=>window.__CHARACTER40_REPORT.loaded&&window.__CHARACTER40_REPORT.characterId===id,id);
   for(const action of ['idle','walk','run','turn']){
     await page.locator(`[data-action="${action}"]`).click();const pictures=new Set();
     for(let k=0;k<6;k++){pictures.add(await page.locator('canvas').evaluate(c=>c.toDataURL()));await page.locator('#step').click();}
     assert.ok(pictures.size>1,`${name} ${id} ${action} has actual frame changes`);
   }
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');assert.deepEqual(errors,[]);
 await page.locator('#character').selectOption('character-01');await page.waitForFunction(()=>window.__CHARACTER40_REPORT.characterId==='character-01'&&window.__CHARACTER40_REPORT.loaded);
 await page.screenshot({path:`character40-${name}.png`,fullPage:true});await browser.close();console.log(`${name}: 40 characters × 4 actions passed`);
}
