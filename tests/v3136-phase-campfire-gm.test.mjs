import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');

test('V3.136: day/night lives outside timeline, village wake-up remains a real turn',()=>{
 const context={};vm.runInNewContext(read('server-game/current/battle-controls.js'),context);
 const rules=context.GMWW_BATTLE_CONTROLS;
 const runtime={cursor:1,completed:false,queue:[{id:'intro',kind:'wolf-introduction'},{id:'wake',kind:'village-wakeup'}]};
 assert.equal(rules.timeline('night',runtime,3)[0].label,'Bầy sói ơi dậy đi');
 assert.equal(rules.timeline('night',runtime,3)[1].label,'Làng ơi dậy đi');
 assert.equal(rules.timeline('day',runtime,3)[0].label,'Làng ơi dậy đi');
 const html=read('server-game/current/GMWW.html'),battle=read('server-game/src/40-battle-and-timeline.part');
 const back=html.indexOf('id="battleBack"'),timeline=html.indexOf('id="battleTimeline"'),forward=html.indexOf('id="battleAdvance"');
 assert.ok(back>=0&&back<timeline&&timeline<forward);
 assert.ok(!html.includes('id="battlePeriodLabel"'));
 assert.ok(html.includes('<b>ĐÊM THỨ 1</b></button>'));
 assert.ok(html.includes('<b>NGÀY THỨ 1</b></button>'));
 assert.ok(battle.includes("label.textContent='ĐÊM THỨ '+night"));
 assert.ok(battle.includes("label.textContent='NGÀY THỨ '+night"));
 assert.ok(battle.includes('timeline.innerHTML=steps.map'));
 assert.ok(!battle.includes("timeline.innerHTML=(phase==='night'"));
});
test('V3.136: campfire uses setup-room selection before match and wolf GM tools during match',()=>{
 const source=read('server-game/current/app.js');
 assert.ok(source.includes("document.querySelector('.play-core-pearl')?.addEventListener('click',()=>{if(playSceneState.step==='battle'){battleToggleWolfMenu();return}openPlayCreateRoomSheet()});"));
 const setup=read('server-game/src/30-village-and-setup.part');
 assert.ok(setup.includes("if(playSceneState.step!=='battle'){playFlashError('Chỉ được thực hiện tác động sau khi vào trận.');return false}"));
 assert.ok(setup.includes("function openPlayGMSheet(){"));
 assert.ok(setup.includes("if(playSceneState.step!=='battle')return;\n  battleToggleWolfMenu();"));
 assert.ok(!setup.includes("savePlayScene();renderPlayScene();openPlayGMSheet()"));
});
test('V3.136: source parts and published runtime version remain consistent',()=>{
 const p=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(read('server-game/current/app.js'),p.map(name=>read('server-game/src/'+name)).join(''));
 const v=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.ok(Number(v.split('.')[1])>=136);
 assert.ok(read('server-game/current/GMWW.html').includes('<title>GMWW V'+v+'</title>'));
 assert.ok(read('src/index.js').includes('VERSION="V'+v+'"'));
});
