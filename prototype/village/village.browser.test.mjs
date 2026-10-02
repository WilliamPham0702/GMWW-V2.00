import assert from "node:assert/strict";
import {chromium,devices} from "playwright";
import {mkdir} from "node:fs/promises";
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({...devices["iPhone 13"],browserName:undefined});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:8080/prototype/village/",{waitUntil:"networkidle"});
  assert.equal(await page.locator(".player").count(),12);
  const bg=await page.locator(".stage").evaluate(el=>getComputedStyle(el).backgroundImage);
  assert(bg.includes("village-coast.svg"),"original village artwork must load");
  await page.locator("#size").selectOption("30");
  assert.equal(await page.locator(".player").count(),30);
  const ids=await page.locator(".player").evaluateAll(els=>els.map(e=>e.dataset.playerId));
  assert.equal(new Set(ids).size,30);
  await page.locator(".player").nth(17).click();
  assert(await page.locator("#selection").isVisible(),"tapping a player must open selection");
  assert(await page.locator(".player.selected").count()===1);
  await page.locator("#clearSelection").click();
  assert(await page.locator("#selection").isHidden());
  await mkdir("prototype/village/screenshots",{recursive:true});
  await page.screenshot({path:"prototype/village/screenshots/day-30-mobile.png",fullPage:true});
  await page.locator("#mode").click();
  assert(await page.locator("#game").evaluate(el=>el.classList.contains("night")));
  assert(await page.locator("#voice").isHidden(),"no voice at night");
  await page.screenshot({path:"prototype/village/screenshots/night-30-mobile.png",fullPage:true});
  // Verify real public room adapter without hitting production or exposing secret role data.
  await page.route("**/api/avatars/*/image",route=>route.fulfill({status:200,contentType:"image/svg+xml",body:`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#4aa"/></svg>`}));
  await page.route("**/api/rooms/AB12",route=>route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({ok:true,room:{roomName:"Phòng kiểm thử"},players:[
      {participantId:"p1",displayName:"Lan",avatarId:"avatar-cut-001",online:true,secretRole:"wolf"},
      {participantId:"p2",displayName:"Minh",avatarId:"avatar-cut-002",online:false}
    ]})
  }));
  await page.goto("http://127.0.0.1:8080/prototype/village/?room=AB12",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll(".player").length===2);
  assert.equal(await page.locator(".player").count(),2);
  assert.deepEqual(await page.locator(".player").evaluateAll(els=>els.map(e=>e.dataset.playerId)),["p1","p2"]);
  assert.equal(await page.locator(".roster").innerText().then(t=>t.includes("wolf")),false);
  await page.waitForFunction(()=>document.querySelectorAll(".portrait.has-image img").length===2);
  await page.screenshot({path:"prototype/village/screenshots/public-room-mobile.png",fullPage:true});
  // Verify the exact static path used by Cloudflare ASSETS after merge, not only the source prototype.
  await page.goto("http://127.0.0.1:8080/assets/village/?room=AB12",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll(".player").length===2);
  const stagedBg=await page.locator(".stage").evaluate(el=>getComputedStyle(el).backgroundImage);
  assert(stagedBg.includes("/assets/village/assets/village-coast.svg"));
  assert.equal(await page.locator(".player").count(),2);
  await page.screenshot({path:"prototype/village/screenshots/staged-static-mobile.png",fullPage:true});
  assert.deepEqual(errors,[],"no browser script errors");
  console.log("Chromium mobile visual smoke: PASS (30 avatars, art, day/night, privacy UI)");
}finally{await browser.close();}
