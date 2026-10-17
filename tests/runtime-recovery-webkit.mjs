import fs from 'node:fs';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
const source=fs.readFileSync('server-game/current/runtime-recovery.js','utf8');
const browser=await webkit.launch({headless:true});
try{
  for(const healthy of [true,false]){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.clock.install();
    await page.route('https://gmww-recovery.test/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path==='/recovery.js')return route.fulfill({contentType:'application/javascript',body:source});
      if(path==='/app.js')return route.fulfill({contentType:'application/javascript',body:healthy?"window.GMWWRuntimeRecovery.ready('3.999');":"const broken = ;"});
      return route.fulfill({contentType:'text/html',body:`<!doctype html><script>window.calls=[];window.GMWW_NATIVE_SHELL_VERSION='3.110';window.webkit={messageHandlers:{gmwwUpdater:{postMessage:m=>window.calls.push(m)}}};localStorage.setItem('GMWW_SAVED_GAME','keep');</script><script src="recovery.js" data-runtime="3.999"></script><script src="app.js"></script>`});
    });
    await page.goto('https://gmww-recovery.test/',{waitUntil:'load'});
    await page.clock.runFor(45001);
    const result=await page.evaluate(()=>({calls:window.calls,data:localStorage.getItem('GMWW_SAVED_GAME')}));
    assert.equal(result.calls.length,healthy?0:1);
    if(!healthy)assert.equal(result.calls[0].action,'rollbackRuntime');
    assert.equal(result.data,'keep');
    if(!healthy){
      await page.reload({waitUntil:'load'});await page.clock.runFor(45001);
      assert.equal(await page.evaluate(()=>window.calls.length),0,'persistent marker prevents a restart loop');
    }
    await context.close();
  }
  console.log('WebKit Runtime recovery: healthy, syntax failure, preserved data and loop guard PASS');
}finally{await browser.close()}
