import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const source=app.match(/const THEME_UI_GROUPS=([\s\S]*?);\n\nconst DEFAULT_STATE=/)?.[1];
assert.ok(source,'Theme group configuration exists');
const groups=vm.runInNewContext('('+source+')');
const entries=groups.flatMap(group=>group.slots);
const keys=entries.map(([key])=>key);
const targets={
 'bg.home':'#home','bg.play':'#start','bg.library':'#library','bg.settings':'#settings',
 'banner.home':'#home .gmww-home-scene-image-v350',
 'ui.homePortal':'#gmwwHomeEnterVillage .gmww-home-portal-art-v352',
 'ui.exploreDeck':'#home [data-home-library-tab="cards"] img',
 'ui.exploreMembers':'#home [data-home-destination="members"] img',
 'ui.exploreTemplates':'#home [data-home-library-tab="templates"] img',
 'ui.bottomNavArt':'#bottomNav'
};
test('Theme editor shows only actively connected image slots',()=>{
 assert.deepEqual([...keys].sort(),Object.keys(targets).sort());
 assert.equal(keys.length,new Set(keys).size,'no duplicated slots');
 assert.equal(groups.length,2,'only backgrounds and linked homepage artwork');
 assert.equal(groups.find(x=>x.id==='home').slots.length,6);
 for(const key of keys)assert.ok(app.includes("'"+key+"':'"+targets[key]+"'"),'Missing actual UI target '+key);
});
test('Homepage fields are wired to real current home elements and no obsolete card choices',()=>{
 assert.match(html,/class="gmww-home-scene-image-v350"/);
 assert.match(html,/id="gmwwHomeEnterVillage"/);
 assert.match(html,/class="gmww-home-portal-art-v352"/);
 assert.match(html,/data-home-library-tab="cards"/);
 assert.match(html,/data-home-destination="members"/);
 assert.match(html,/data-home-library-tab="templates"/);
 assert.match(html,/id="bottomNav"/);
 assert.ok(!keys.includes('ui.exploreActions'));
 assert.ok(!keys.includes('ui.exploreFactions'));
 assert.ok(!keys.includes('ui.memberPanel'));
 assert.ok(!keys.includes('bg.deck'));
 assert.ok(!keys.includes('banner.dawn'));
});
test('Theme update immediately uses local or URL artwork and can reset to shipped images',()=>{
 assert.match(app,/Promise\.all\(targets\.map\(async slot/);
 assert.match(app,/const id=state\.themes\.activeId\|\|'theme-sea',token=\+\+activeThemeApplyToken/);
 assert.match(app,/img\.dataset\.themeDefaultSrc=img\.getAttribute\('src'\)/);
 assert.match(app,/img\.setAttribute\('src',src\|\|img\.dataset\.themeDefaultSrc\)/);
 assert.match(app,/\.src=src\|\|defaultThemeSlotPreview\(slotId\)\|\|''/);
 assert.match(app,/async function saveUiSlotUrl\(/);
 assert.match(app,/function pickUiSlotFile\(/);
 assert.match(app,/async function clearUiSlot\(/);
 assert.match(app,/const local=await blobUrlFor\(uiBlobKey\(themeId,slotId\)\)/);
 assert.match(app,/function addTheme\(/,'theme additions preserved');
 assert.match(app,/style\.setProperty\('background-image',[\s\S]*?'important'\)/);
 assert.match(app,/style\.removeProperty\('background-image'\)/);
});
test('Existing saved theme images are only hidden, never deleted by slot list cleanup',()=>{
 assert.match(app,/t\.ui=t\.ui\|\|\{\}/);
 assert.match(app,/t\.ui\[slotId\]\.url/);
 assert.match(app,/state\.themes\.list\.push/);
 assert.doesNotMatch(app,/delete t\.ui\['ui\.memberPanel'\]/);
 assert.doesNotMatch(app,/delete t\.ui\['banner\.deck'\]/);
});
test('Runtime version bumps and preserves native shell',()=>{
 assert.match(app,/const VERSION='3\.74';/);
 assert.match(html,/<title>GMWW V3\.74<\/title>/);
 assert.match(html,/app\.js\?v=3\.74-delivery-progress/);
 const worker=fs.readFileSync('src/index.js','utf8');
 assert.match(worker,/VERSION="V3\.74",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-374"/);
});
