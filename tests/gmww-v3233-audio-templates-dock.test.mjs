import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const part=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('iPhone: Thư viện Audio không gọi forEach trên null',async()=>{
 const a=part.indexOf('async function renderAudio(){'),b=part.indexOf('async function playAudioItem(',a);
 assert.ok(a>=0&&b>a);
 const fn=part.slice(a,b);
 assert.doesNotMatch(fn,/(?<!\$)\$\('\[data-system-sound-slot\]'\)\.forEach/);
 assert.match(fn,/\$\$\('\[data-system-sound-slot\]'\)\.forEach/);
 const button={dataset:{systemSoundSlot:'audio_system_day_wakeup'},onclick:null};
 const grid={innerHTML:''},add={onclick:null},called=[];
 const ctx={state:{audio:{system:[{id:'audio_system_day_wakeup',targetId:'audio_system_day_wakeup',name:'Wake',fileName:''}]}},
  audioKind:'system',audioHasFile:async()=>false,esc:x=>String(x??''),
  $:selector=>selector==='#audioGrid'?grid:selector==='#addAudioBox'?add:null,
  $$:selector=>selector==='[data-system-sound-slot]'?[button]:[],
  replaceAudioItem:(item,kind)=>called.push([item.id,kind]),playFlashError:msg=>{throw Error(msg)},
  alert(){},saveState(){},renderAudio(){},uid(){return 'stub'}
 };
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 await ctx.renderAudio();
 assert.equal(typeof button.onclick,'function');
 button.onclick();assert.equal(called.length,1);assert.deepEqual(called[0],['audio_system_day_wakeup','system']);
 ctx.$$=()=>[];await ctx.renderAudio();
});
test('Cloudflare button has compact two-line name without changing 16 tools',()=>{
 assert.match(html,/id="gmwwCloudflareOpen"[^>]*>[\s\S]*?gmww-cloudflare-label/);
 assert.match(html,/gmww-cloudflare-label"><span>QUẢN LÝ<\/span><span>CLOUDFLARE<\/span>/);
 assert.match(css,/#gmwwCloudflareOpen \.gmww-cloudflare-label\{/);
 const tools=html.slice(html.indexOf('id="settingsToolsRail"'),html.indexOf('id="settingsNoticePanel"'));
 assert.equal([...tools.matchAll(/<button\b[^>]*\bid="[^"]+"/g)].length,16);
});
test('Ván gợi ý / AUTO VÁN / THÊM MỚI share one row without duplicate controls',()=>{
 const start=html.indexOf('class="play-template-picker-row play-template-actions-row"'),end=html.indexOf('id="playGameTemplateBack"',start),t=html.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(t.indexOf('playGameTemplateSelect')<t.indexOf('playGameAuto'));
 assert.ok(t.indexOf('playGameAuto')<t.indexOf('playGameTemplateAdd'));
 for(const id of ['playGameTemplateSelect','playGameAuto','playGameTemplateAdd'])assert.equal(html.split('id="'+id+'"').length-1,1);
 assert.match(css,/#playGameSheet \.play-template-actions-row\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/class="play-auto-game-area"/);
});
test('Battle day row is clock → 🏖️ → actions → ⛱️ → 🌈; Undo returns at night',()=>{
 const a=source.indexOf('// V3.233: five exclusive slots'),b=source.indexOf('// DEMO alone keeps',a),dock=source.slice(a,b);
 assert.ok(a>=0&&b>a);
 const names=['playBattleClockFloat','battleDayNoticeFloat','battleMainActionSlot','battleDayGallowsFloat','battleFactionStatsFloat'];
 const slots=dock.slice(dock.indexOf('for(const item of [document.getElementById('),dock.indexOf('])',dock.indexOf('for(const item of [document.getElementById(')));
 const order=names.map(x=>x==='battleMainActionSlot'?slots.indexOf('actionSlot'):slots.indexOf("document.getElementById('"+x+"')"));
 assert.ok(order.every((v,i)=>v>=0&&(i===0||v>order[i-1])),JSON.stringify(order));
 assert.match(dock,/battleSeaShortcuts'\)\?\.remove\(\)/);
 assert.match(css,/#battleBottomControls #battleUndoFloat\{\s*display:none!important/);
 assert.match(css,/data-battle-phase="night"\] #battleBottomControls #battleUndoFloat:not\(\[hidden\]\)/);
 assert.match(html,/id="battleUndoFloat"/,'Undo logic remains available');
});
test('Runtime source bundle and OTA metadata are intact',()=>{
 const pieces=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(app,pieces.map(p=>fs.readFileSync('server-game/src/'+p,'utf8')).join(''));
 assert.match(app,/const VERSION='3\.234';/);
 assert.match(html,/<title>GMWW V3\.234<\/title>/);
 assert.match(fs.readFileSync('src/index.js','utf8'),/VERSION="V3\.234"/);
 assert.match(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),/V3\.233: Sửa lỗi/);
});
