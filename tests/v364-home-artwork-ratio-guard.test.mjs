import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
test('Home artwork follows approved image ratios without cropping',()=>{
 assert.match(css,/Home artwork v2: dimensions follow/);
 assert.match(css,/aspect-ratio:1024 \/ 380!important/);
 assert.match(css,/aspect-ratio:1024 \/ 260!important/);
 assert.match(css,/aspect-ratio:1\/1!important/);
 assert.match(css,/#home \.gmww-home-scene-v351 \.gmww-home-scene-image-v350\{[\s\S]*?object-fit:contain!important/);
 for(const key of ['banner.home','ui.homePortal','ui.exploreDeck','ui.exploreMembers','ui.exploreTemplates'])assert.ok(app.includes("'"+key+"':"),'active image slot '+key);
});
test('Bottom navigation rejects screenshot-like aspect ratios and keeps real buttons',async()=>{
 assert.match(html,/id="bottomNav"/);
 assert.match(app,/navArtworkHasCorrectRatio\(src\)/);
 const snippet=app.match(/function navArtworkHasCorrectRatio\(src\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(snippet);
 const ctx={Image:class{
  set src(s){const [w,h]=({clean:[2048,280],poster:[975,205],square:[768,768]})[s]||[0,0];this.naturalWidth=w;this.naturalHeight=h;queueMicrotask(()=>this.onload());}
 },setTimeout,clearTimeout};
 vm.runInNewContext(snippet,ctx);
 assert.equal(await ctx.navArtworkHasCorrectRatio('clean'),true);
 assert.equal(await ctx.navArtworkHasCorrectRatio('poster'),false);
 assert.equal(await ctx.navArtworkHasCorrectRatio('square'),false);
 assert.match(app,/el\.style\.removeProperty\('background-image'\)/);
});