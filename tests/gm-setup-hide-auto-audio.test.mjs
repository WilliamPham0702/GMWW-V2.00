import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
test('GM setup hides Auto GM and Audio without removing their battle controls',()=>{
 assert.match(app,/shell\.dataset\.phase=playSceneState\.phase;shell\.dataset\.step=playSceneState\.step/);
 const block=css.slice(css.indexOf('/* V3.59 — GM pregame dock: hide Auto GM and Audio'));
 assert.match(block,/#playShell\[data-phase="lobby"\]/);
 assert.match(block,/grid-template-columns:48px minmax\(0,1fr\) 48px!important/);
 assert.match(block,/grid-template-columns:44px minmax\(0,1fr\) 44px!important/);
 for(const id of ['playAutoGM','playAudioTop'])assert.match(block,new RegExp('> #'+id+'\\b'));
 assert.doesNotMatch(block,/\[data-phase="day"\]|\[data-phase="night"\]/);
 for(const id of ['playExitVillage','playPhasePill','playEndGame','playAutoGM','playAudioTop'])assert.ok(html.includes('id="'+id+'"'));
});
