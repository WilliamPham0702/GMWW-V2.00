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
  await mkdir("prototype/village/screenshots",{recursive:true});
  await page.screenshot({path:"prototype/village/screenshots/day-30-mobile.png",fullPage:true});
  await page.locator("#mode").click();
  assert(await page.locator("#game").evaluate(el=>el.classList.contains("night")));
  assert(await page.locator("#voice").isHidden(),"no voice at night");
  await page.screenshot({path:"prototype/village/screenshots/night-30-mobile.png",fullPage:true});
  assert.deepEqual(errors,[],"no browser script errors");
  console.log("Chromium mobile visual smoke: PASS (30 avatars, art, day/night, privacy UI)");
}finally{await browser.close();}
