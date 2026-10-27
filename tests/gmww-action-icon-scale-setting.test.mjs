import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const s=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const b=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
const levels=[25,50,75,100,125,150];
test('GM iCon size offers six approved levels in one row',()=>{
 const section=html.slice(html.indexOf('id="actionIconScaleCard"'),html.indexOf('id="actionIconScaleCard"')+1200);
 assert.match(section,/Kích thước iCon hành động/);
 assert.ok(html.indexOf('id="characterScaleCard"')<html.indexOf('id="actionIconScaleCard"'));
 for(const n of levels)assert.match(section,new RegExp('data-action-icon-scale="'+n+'"'));
});
test('read and update saved iCon size without modifying Character scale',()=>{
 const i=s.indexOf("const ACTION_ICON_SCALE_STORAGE_KEY="),end=s.indexOf('setTimeout(initActionIconScaleSetting,0);',i);
 assert.ok(i>0&&end>i);const snippet=s.slice(i,end);
 assert.ok(app.includes(snippet));
 const cssvars={},label={textContent:''},listeners={},memory=new Map([['GMWW_GM_ACTION_ICON_SCALE_V1','150']]);
 const options=levels.map(n=>({dataset:{actionIconScale:String(n)},classList:{toggle(){}},setAttribute(){}}));
 const choices={addEventListener:(e,cb)=>listeners[e]=cb};
 const ctx={CHARACTER_SCALE_OPTIONS:[75,100,125,150,175,200],document:{documentElement:{style:{setProperty:(key,val)=>cssvars[key]=val}},querySelectorAll:()=>options,getElementById:id=>id==='actionIconScaleChoices'?choices:id==='actionIconScaleValue'?label:null},
 localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},console};
 vm.createContext(ctx);new vm.Script(snippet).runInContext(ctx);
 vm.runInContext('initActionIconScaleSetting()',ctx);
 assert.equal(cssvars['--gmww-action-icon-scale'],'1.5');assert.equal(label.textContent,'150%');
 listeners.click({target:{closest:()=>({dataset:{actionIconScale:'125'}})}});
 assert.equal(memory.get('GMWW_GM_ACTION_ICON_SCALE_V1'),'125');
 assert.equal(cssvars['--gmww-action-icon-scale'],'1.25');
 assert.equal(cssvars['--gmww-character-scale'],undefined);
});
test('all icon images and 3-branch Fairy preserve responsive tap boundaries',()=>{
 assert.match(css,/#battleFireIconDock \.battle-fire-icon:not\(\.is-fairy-triptych\)>img/);
 assert.match(css,/width:min\(calc\(276px \* var\(--gmww-action-icon-scale,1\)/);
 assert.match(css,/calc\(100vw - 22px\)/);
 assert.match(b,/function battleIconScaleRatio\(\)/);
 assert.match(b,/function battleIconClamp\(x,y,isFairy=false\)/);
 assert.match(b,/battleIconSpawnPoint\(entry,i,eligible.length,!!icon.isFairyTriptych\)/);
 assert.match(b,/fairyDirection:battleIsTransfer\(action\)\?/);
});
