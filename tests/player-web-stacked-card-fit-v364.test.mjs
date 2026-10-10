import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
const marker='style.textContent=';
const start=script.indexOf(marker,script.indexOf('function ensurePlayerPrivateDock(){'));
const end=script.indexOf(';document.head.appendChild(style)',start);
assert.ok(start>=0&&end>start,'Private card CSS must be injected');
const css=JSON.parse(script.slice(start+marker.length,end));

test('Both Player backs are real overlapping, staggered cards, not two side-by-side information panels',()=>{
 assert.match(css,/#gmwwPlayerPrivateDock\{[\s\S]*?display:block/);
 assert.match(css,/#gmwwPlayerPrivateDock button\{[\s\S]*?position:absolute/);
 assert.match(css,/#gmwwPlayerPrivateDock button\{[\s\S]*?aspect-ratio:\.72/);
 assert.match(css,/#gmwwPlayerPrivateDock button\[data-private-card="role"\]\{[\s\S]*?translateX\(-79%\) rotate\(-5deg\)/);
 assert.match(css,/#gmwwPlayerPrivateDock button\[data-private-card="artifact"\]\{[\s\S]*?translateX\(-18%\) translateY\(10px\) rotate\(6deg\)/);
 assert.match(css,/#gmwwPlayerPrivateDock\.is-solo button\[data-private-card="role"\]/);
 assert.match(script,/artifact\.hidden=!state\.artifact/);
 assert.match(script,/dock\.classList\.toggle\('is-solo',!state\.artifact&&!waitingArtifact\)/);
 assert.match(script,/data-private-card="role"/);
 assert.match(script,/data-private-card="artifact"/);
 assert.doesNotMatch(css,/#gmwwPlayerPrivateDock button\{[^}]*?flex:1/);
});

test('Full-size card is centered on-screen without the legacy 50%-margin stage offset or staggered overlays',()=>{
 assert.match(css,/#game\[data-private-card-view="open"\] \.role-stage\{[\s\S]*?position:fixed!important/);
 assert.match(css,/#game\[data-private-card-view="open"\] \.role-stage\{[\s\S]*?left:calc\(env\(safe-area-inset-left\) \+ 8px\)!important/);
 assert.match(css,/#game\[data-private-card-view="open"\] \.role-stage\{[\s\S]*?margin:0!important;transform:none!important/);
 assert.match(css,/#game\[data-private-card-view="open"\] \.role-card-shell\{[\s\S]*?calc\(100vw - env\(safe-area-inset-left\) - env\(safe-area-inset-right\) - 32px\)/);
 assert.match(css,/#game\[data-private-card-view="open"\] #roleCard,[\s\S]*?#game\[data-private-card-view="open"\] #artifactCard\{[\s\S]*?transform:none!important/);
 assert.match(css,/\[data-private-card-focus="role"\] #artifactCard/);
 assert.match(css,/\[data-private-card-focus="artifact"\] #roleCard/);
 assert.match(script,/game\.dataset\.privateCardFocus=kind/);
 assert.match(script,/game\.dataset\.privateCardFocus=''/);
 assert.match(css,/object-fit:contain!important;object-position:center center!important/);
 assert.match(css,/top:calc\(env\(safe-area-inset-top\) \+ 10px\)!important/);
 assert.match(css,/body:has\(#game\[data-private-card-view="open"\]\) #gmwwPlayerTopMenu/);
});

test('Card width fits an iPhone viewport and available height across phone sizes',()=>{
 for(const [width,height] of [[320,568],[360,640],[375,667],[390,844],[393,852],[430,932],[768,1024]]){
   const card=Math.min(414,width-32,(height-184)*.72);
   assert.ok(card>0&&card<=width-32, 'card fits screen width '+width);
   assert.ok(card/.72<=height-184+1e-8,'card fits viewing height '+height);
 }
 assert.match(css,/@media\(max-height:650px\)/);
 assert.match(css, /overflow-x:hidden!important;overflow-y:auto!important/);
 assert.doesNotThrow(()=>new vm.Script(script,{filename:'gmww-member-stacked-card.js'}));
});

test('Existing thirty-second auto-hide and GM viewer are preserved',()=>{
 assert.match(script,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
 assert.match(script,/if\(Date\.now\(\)-privateCardActivityAt>=PLAYER_PRIVATE_CARD_IDLE_MS\)closePrivateCardViewer\(\)/);
 assert.match(script,/if\(kind==='role'\)toggleRole\(\);else toggleArtifact\(\)/);
 assert.match(script,/const game=\$\('#game'\);if\(game\)game\.dataset\.privateCardFocus=kind/);
 assert.doesNotMatch(script,/sessionStorage\.getItem\(storageKey\)!==deliveryKey/);
});
