import assert from 'node:assert/strict';
import {webkit,devices} from 'playwright';

const base=(process.env.GMWW_SMOKE_BASE_URL||'http://127.0.0.1:8787').replace(/\/$/,'');
const browser=await webkit.launch({headless:true});
try{
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(base+'/village/?ci-pr612='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'Village must load HTTP 200');
  await page.locator('#scene').waitFor({state:'attached'});
  assert.equal(await page.locator('#gamePanel,.scene-controls,.hud,#chatForm,#messages,#voice,#roster,#selection').count(),0,'No old Online UI on first paint');
  for(const text of ['Mọi người nghĩ sao về người số 5?','Nhập tin nhắn (bản mô phỏng)','Minh họa giao diện','Voice đang mở','Thu phóng']){
    assert.equal(await page.getByText(text,{exact:false}).count(),0,'Legacy copy survived: '+text);
  }
  assert.equal(await page.locator('.player').count(),0,'Standalone village must not spawn sample players');
  const bounds=await page.locator('.stage').boundingBox();
  const viewportHeight=await page.evaluate(()=>window.innerHeight);
  assert(bounds&&bounds.height>=viewportHeight*0.9,'Village scene should fill the current Safari viewport: '+JSON.stringify({bounds,viewportHeight}));
  await page.screenshot({path:'/tmp/gmww-pr612-iphone-webkit-village.png',fullPage:true});
  const home=await page.goto(base+'/?ci-pr612='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(home?.status(),200,'Player Web home must load');
  assert.match(await page.content(),/GMWW PLAYER|gmww-members-live/i,'Real Player Web remains present');
  assert.deepEqual(errors,[],'No uncaught Safari WebKit scripts');
  console.log('PASS: iPhone Safari WebKit emulation, no old Online setup, real Player Web preserved');
}finally{await browser.close();}
