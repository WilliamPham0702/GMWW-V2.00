import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const rule=(selector)=>{
 const start=css.indexOf(selector+'{');
 assert.ok(start>=0,'Missing CSS rule: '+selector);
 const end=css.indexOf('}',start);
 assert.ok(end>start);
 const body=css.slice(start,end);
 const z=body.match(/z-index:\s*(\d+)/);
 assert.ok(z,'Missing z-index: '+selector);
 return Number(z[1]);
};
test('Icons from document.body render above immersive GM village on iPhone',()=>{
 const village=rule('body.play-immersive #start.play-page.active');
 const dock=rule('.battle-fire-icon-dock');
 assert.ok(dock>village,`Action dock z-index ${dock} must exceed immersive village ${village}`);
 assert.ok(rule('.gmww-battle-icon-ghost')>dock,'Dragged ghost must remain above dock');
 assert.match(css,/\.battle-fire-icon-dock\[hidden\]\s*\{display:none\}/);
});
test('Active Core actions still drive fire icons, toggle, hit target and existing confirmation',()=>{
 const section=app.slice(app.indexOf('function battleIconDock('),app.indexOf('// Repaint the current GM turn',app.indexOf('function battleIconDock(')));
 assert.ok(section.length>1000);
 assert.ok(section.includes("document.body.appendChild(dock)"),'The dock is outside immersive stacking context');
 assert.ok(section.includes('!a.unavailable&&a.actionId'),'Only eligible Core actions appear');
 assert.ok(section.includes('battleIconResolve(a)'),'Icons use library mapping');
 assert.ok(section.includes('battleIconOn()'),'GM on/off toggle remains connected');
 assert.ok(section.includes('pointerdown')&&section.includes('pointermove')&&section.includes('pointerup'),'Pointer dragging retained');
 assert.ok(section.includes('battleIconTargetAt(e.clientX,e.clientY,a)'),'Target snapping uses actual release position');
 assert.ok(section.includes('battlePickTargetWithAudio'),'Use the same Core target selection');
 assert.ok(section.includes('battleConfirm(true)'),'Same Core confirmation');
 assert.ok(section.includes('battleIconClearDrag()'),'Cancel or restore dragging');
});
test('GM loads icon library before battle script and leaves the IPA shell unchanged',()=>{
 assert.ok(html.indexOf('src="action-icon-library.js')>=0);
 assert.ok(html.indexOf('src="action-icon-library.js')<html.indexOf('src="app.js'));
 assert.match(css,/\.battle-fire-icon\s*\{[^}]*touch-action:none/);
});

test('V3.228 icons stay frameless, return to 40px and preserve successive multi-target drops',()=>{
 assert.match(css,/#battleFireIconDock\.battle-fire-icon-dock\{[^}]*background:transparent!important/);
 assert.match(css,/#battleFireIconDock \.battle-fire-icon\{[^}]*background:transparent!important/);
 assert.match(css,/#battleFireIconDock \.battle-fire-icon img\{[^}]*width:40px!important/);
 assert.match(app,/battleIconPositions\.delete\(key\)/);
 assert.match(app,/battleIconFirePoint\(\)/);
 assert.match(app,/\bis-sucked\b/);
});
