// Real layout and user actions; all room/API data is synthetic and local to this page.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {PLAYER_ROOM_ROLE_CATALOG} from '../src/player-room-role-catalog.js';
const baseline=process.argv.includes('--expect-layout-failure');
const sourcePath=process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'src/player-web-src/37-player-rooms.part';
const source=fs.readFileSync(sourcePath,'utf8').replace('setInterval(mount,1500);','window.roomFixture={pr,mount,render};');
const menu=gmwwMembersLiveScript.match(/const GMWW_SERVER_MENU=(.*);\n/)[1];
const host=fs.readFileSync('src/player-page-src/00-head-and-style.part','utf8');
fs.mkdirSync('artifacts/template-layout',{recursive:true});
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch();
 try{for(const [width,height] of [[390,844],[768,1024],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://fixture.test/**',r=>r.request().url().includes('/api/gm/template-role-artwork/')?r.fulfill({contentType:'image/webp',body:fs.readFileSync('assets/updates/runtime/V3.119/assets/role-artwork-v251/original/'+new URL(r.request().url()).pathname.split('/').pop()+'.webp')}):r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'}));
  await page.goto('http://fixture.test/');
  for(const m of host.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))await page.addStyleTag({content:m[1]});
  await page.evaluate(roles=>{
   window.state={token:'synthetic',member:{loginId:'test'},roomCode:'ABCDEF',activeScreenId:'game'};
   window.setInterval=()=>0;window.auth=()=>({});window.syncVillageFrame=()=>{};window.toast=()=>{};
   window.savedTemplates=[];window.requests=[];
   window.api=async(url,options={})=>{
    const data=options.body?JSON.parse(options.body):{};requests.push({url,data});
    if(url.endsWith('/template-save')){savedTemplates=[{id:'saved',name:data.name,canEdit:true,playerCount:3,compiledConfig:{...data,id:'saved',roles:data.roles.map(r=>({...roles.find(x=>x.roleId===r.roleId),...r}))}}];return {ok:true};}
    if(url.endsWith('/templates'))return {templates:savedTemplates};
    if(url.endsWith('/roles'))return {roles,artifacts:[]};
    if(url.endsWith('/state'))return roomFixture.pr.state;
    return {ok:true};
   };
  },PLAYER_ROOM_ROLE_CATALOG);
  await page.addScriptTag({content:'const GMWW_SERVER_MENU='+menu+';\n'+source});
  await page.evaluate(roles=>{const f=roomFixture;f.mount();Object.assign(f.pr,{open:true,own:{code:'ABCDEF',token:'synthetic'},view:'game',catalogStatus:'ready',roles,state:{room:{phase:'lobby',seatsLocked:true},players:[{loginId:'test'},{loginId:'a'},{loginId:'b'}]}});f.render();},PLAYER_ROOM_ROLE_CATALOG);
  const checkLayout=async()=>page.evaluate(()=>{
   const row=document.querySelector('.gmww-pr-game-actions'),footer=document.querySelector('.gmww-pr-game-footer');
   const r=row.getBoundingClientRect(),f=footer.getBoundingClientRect();
   const controls=[...row.querySelectorAll('select,button')].map(n=>n.getBoundingClientRect());
   return {rowHeight:r.height,footerTop:f.top,rowBottom:r.bottom,controlsFit:controls.every(c=>c.height>=40&&c.height<130&&c.bottom<=r.bottom+1),noHorizontalOverflow:document.querySelector('.gmww-pr-body').scrollWidth<=document.querySelector('.gmww-pr-body').clientWidth+1};
  });
  const initial=await checkLayout();
  await page.screenshot({path:`artifacts/template-layout/${baseline?'before':'picker'}-${engine}-${width}.png`});
  if(baseline){assert.ok(!initial.controlsFit||initial.rowHeight>150||initial.footerTop<initial.rowBottom,JSON.stringify(initial));console.log('REPRODUCED layout',engine,width,initial);await page.getByRole('button',{name:'+ THÊM MỚI',exact:true}).click();await page.waitForFunction(()=>roomFixture.pr.msg.includes('resolveArtwork'));assert.match(await page.evaluate(()=>roomFixture.pr.msg),/resolveArtwork/);assert.equal(await page.locator('#gmwwPrDeckName').count(),0);await page.screenshot({path:`artifacts/template-layout/before-empty-designer-${engine}-${width}.png`});console.log('REPRODUCED empty designer',engine,width);await page.close();continue;}
  assert.ok(initial.controlsFit&&initial.noHorizontalOverflow&&initial.rowHeight<150&&initial.footerTop>=initial.rowBottom,JSON.stringify(initial));
  await page.getByRole('button',{name:'+ THÊM MỚI',exact:true}).click();
  await page.locator('#gmwwPrDeckName').fill('Mẫu kiểm thử');
  await page.waitForFunction(()=>{const img=document.querySelector('.gmww-pr-role-card img');return img?.src.includes('/api/gm/template-role-artwork/')&&img.naturalWidth>0;});
  for(const name of PLAYER_ROOM_ROLE_CATALOG.slice(0,3).map(r=>r.roleName))await page.getByRole('button',{name,exact:false}).first().click();
  assert.equal(await page.locator('.gmww-pr-selected-role').count(),3);
  await page.screenshot({path:`artifacts/template-layout/designer-${engine}-${width}.png`});
  await page.getByRole('button',{name:'LƯU',exact:true}).click();
  await page.getByRole('combobox',{name:'Chọn Ván Mẫu',exact:true}).selectOption('saved');
  await page.getByText('THỜI GIAN RIÊNG TỪNG VAI • Chạm để tùy chỉnh (giây)',{exact:true}).click();
  const seconds=page.locator('.gmww-pr-timing').nth(1).locator('input').first();
  await seconds.fill('45');await seconds.press('Tab');
  await page.getByRole('button',{name:'CHỌN VÁN',exact:true}).click();
  const applied=await page.evaluate(()=>requests.findLast(r=>r.url.endsWith('/template')));
  assert.equal(applied.data.templateId,'saved');assert.ok(Object.values(applied.data.matchOverrides.roleDurations).includes(45));
  assert.deepEqual(errors,[]);console.log('PASS picker → designer → select roles → save → per-role time → apply',engine,width);
  await page.close();
 }}finally{await browser.close();}
}
