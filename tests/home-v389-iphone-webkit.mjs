// WebKit iPhone-sized presentation regression for GMWW Home Khám Phá.
// This checks real computed styles using the actual GMWW.html and style.css files.
// Emulation is NOT a physical-device acceptance test.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {webkit} from 'playwright';

const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.goto(pathToFileURL(resolve('server-game/current/GMWW.html')).href,{waitUntil:'domcontentloaded',timeout:30000});
 const frame=page.locator('#home .gmww-home-premium-v366 > .gmww-home-discover-banner-v352');
 await frame.waitFor({state:'visible',timeout:15000});
 const style=await frame.evaluate(el=>{
  const s=getComputedStyle(el);
  return {background:s.backgroundColor,image:s.backgroundImage,border:s.borderTopWidth,shadow:s.boxShadow,blur:s.backdropFilter,round:s.borderTopLeftRadius};
 });
 assert.ok(style.background==='rgba(0, 0, 0, 0)'||style.background==='transparent','Khám Phá outer background must be fully transparent');
 assert.equal(style.image,'none','Khám Phá must not overlay a colored backdrop');
 assert.equal(style.border,'0px','Khám Phá outer frame must have no border');
 assert.equal(style.shadow,'none','Khám Phá outer frame must have no shadow');
 assert.equal(style.blur,'none','Khám Phá outer frame must not blur the village');
 assert.equal(style.round,'0px','Khám Phá outer frame must not have rounded corners');
 const tiles=frame.locator('.gmww-home-tiles-v350 > button');
 assert.equal(await tiles.count(),3,'Three original clickable shortcuts remain');
 for(const name of ['Bộ Bài','Thành Viên','Ván Mẫu']){
  const button=tiles.filter({hasText:name});
  assert.equal(await button.count(),1,name);
  assert.ok(await button.isVisible(),name+' shortcut must be visible');
  assert.ok(await button.locator('img').count(),name+' artwork preserved');
 }
 await page.screenshot({path:'/tmp/gmww-v389-iphone-webkit-home.png',fullPage:true});
 console.log('GMWW V3.89 iPhone-sized WebKit Khám Phá computed styles and 3 tiles PASS',style);
 await context.close();
}finally{await browser.close()}
