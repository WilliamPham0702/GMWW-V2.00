import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { gmwwMembersLiveScript } from '../src/gmww-members-live.js';
import { patchPrivatePlayerCards } from '../src/gmww-player-private-card-patch.js';

const player = patchPrivatePlayerCards(gmwwMembersLiveScript);

function offlineDeckCss() {
  const from = player.indexOf('sheet.textContent=', player.indexOf('function renderPlayerPrivateDock(){'));
  const to = player.indexOf(';document.head.appendChild(sheet)', from);
  assert.ok(from >= 0 && to > from, 'GM matched fan stylesheet mounted');
  return JSON.parse(player.slice(from + 'sheet.textContent='.length, to));
}

test('Player private deck uses GM overlap geometry, keeping the exposed rear edge tappable', () => {
  const css = offlineDeckCss();
  assert.match(css, /width:min\(160px,44vw\)!important/);
  assert.match(css, /aspect-ratio:84\/104!important/);
  assert.match(css, /left:12px!important;right:auto!important;top:4px!important/);
  assert.match(css, /left:auto!important;right:12px!important;top:4px!important/);
  assert.match(css, /\[data-deck-top="role"\]/);
  assert.match(css, /\[data-deck-top="artifact"\]/);
  assert.match(css, /translateY\(-8px\) rotate\(0deg\) scale\(1\.06\)/);
  assert.match(css, /translateY\(8px\) rotate\(8deg\)/);
  assert.match(css, /translateY\(5px\) rotate\(-7deg\)/);
  for (const width of [320, 375, 390, 430]) {
    const fanWidth=Math.min(160,width*.44);
    const cardWidth=Math.min(90,Math.max(76,width*.22));
    const overlap=2*cardWidth+24-fanWidth;
    assert.ok(overlap>0 && overlap<cardWidth*.85, 'two overlapping cards with reachable rear edge at '+width);
  }
});

test('Rear card swaps forward without revealing; front card opens private viewer',()=>{
  assert.match(player, /if\(state\.artifact&&gmwwDeckPreferredTop!==kind\)\{\s*gmwwPendingPrivateCardTap='';gmwwDeckBringToFront\(kind\);return;/);
  assert.match(player, /gmwwPendingPrivateCardTap='';gmwwDeckBringToFront\(kind\);openPrivateCardViewer\(kind\)/);
  assert.match(player, /dock\.dataset\.deckTop=state\.artifact&&gmwwDeckPreferredTop==='artifact'\?'artifact':'role'/);
  assert.match(player, /button\.setAttribute\('aria-pressed',String\(dock\.dataset\.deckTop===kind\)\)/);
  assert.match(player, /gmwwDeckPreferredTop=gmwwDeckRoleWasViewed\(\)\?'artifact':'role'/);
  assert.match(player, /gmwwViewedRoleDeck\.add\(gmwwDeckRoleIdentity\(\)\);gmwwDeckPreferredTop='artifact'/);
  assert.match(player, /const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
  assert.doesNotThrow(()=>new vm.Script(player));
});

test('Player view remains private and solo-mode hides Artifact without touching assignments',()=>{
  const css=offlineDeckCss();
  assert.match(css, /#gmwwPlayerPrivateDock\.is-solo button\[data-private-card="role"\]/);
  assert.match(player, /artifact\.hidden=!state\.artifact&&!waitingArtifact/);
  assert.match(player, /dock\.classList\.toggle\('is-solo',!state\.artifact&&!waitingArtifact\)/);
  assert.doesNotMatch(player, /\/api\/rooms\/'\+state\.roomCode\+'\/assignments'/);
});
