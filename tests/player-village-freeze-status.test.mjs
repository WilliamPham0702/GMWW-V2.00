import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mapPublicPlayers } from '../assets/village/village.mjs';
import { gmwwMembersLiveScript } from '../src/gmww-members-live.js';

const server = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const village = fs.readFileSync(new URL('../assets/village/village.mjs', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/village/village.css', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../assets/village/index.html', import.meta.url), 'utf8');
const frozenHelperSource = server.match(/function activeFrozenLoginIds\(interactions,meta=\{\},now=Date\.now\(\)\)\{[\s\S]*?\n\}/)?.[0];
const activeFrozenLoginIds = new Function('normalizeLoginId', `${frozenHelperSource}; return activeFrozenLoginIds`)(value => String(value || '').trim().toLowerCase());

test('public freeze status includes only active frozen interactions for the current match', () => {
  const now = Date.parse('2026-10-12T10:00:00Z');
  const rows = [
    { type: 'frozen', loginId: ' Alice ', effectActive: true, matchId: 'm1', expiresAt: '2026-10-12T10:01:00Z' },
    { type: 'frozen', loginId: 'expired', effectActive: true, matchId: 'm1', expiresAt: '2026-10-12T09:59:00Z' },
    { type: 'frozen', loginId: 'inactive', effectActive: false, matchId: 'm1' },
    { type: 'frozen', loginId: 'other-match', effectActive: true, matchId: 'm2' },
    { type: 'dead', loginId: 'private-dead', effectActive: true, matchId: 'm1' },
    { type: 'assassin_mark', loginId: 'private-mark', effectActive: true, matchId: 'm1' },
  ];
  assert.deepEqual([...activeFrozenLoginIds(rows, { matchId: 'm1' }, now)], ['alice']);
  assert.deepEqual([...activeFrozenLoginIds(rows, { matchId: 'm1' }, Date.parse('2026-10-12T10:02:00Z'))], []);
});

test('public room API adds only a boolean frozen field and checks server expiry', () => {
  assert.match(server, /activeFrozenLoginIds\(interactions,meta,Date\.now\(\)\)/);
  assert.match(server, /frozen:meta\?\.statusDisplay\?\.frozen===false\?false:frozenLogins\.has\(normalizeLoginId\(p\?\.loginId\)\)/);
  assert.match(server, /statusTags:statusTagsFor\(interactions,meta,p\?\.loginId,players\)/);
  assert.match(server, /async publicState\(\)/);
});

test('Player Web village maps public frozen state to the character node and updates it on refresh', () => {
  const mapped = mapPublicPlayers({ players: [{ id: 'a', loginId: 'alice', frozen: true }, { id: 'b', loginId: 'bob', frozen: false }] });
  assert.equal(mapped.find(p => p.id === 'a').frozen, true);
  assert.equal(mapped.find(p => p.id === 'b').frozen, false);
  assert.match(village, /frozen:p\?\.frozen===true/);
  assert.match(village, /button\.classList\.toggle\("is-frozen",data\?\.frozen===true&&!gm\)/);
  assert.match(css, /\.player\.is-frozen:not\(\.gm\) \.portrait\.game-character:before/);
  assert.match(css, /\.player\.is-frozen:not\(\.gm\) \.portrait\.game-character:after[\s\S]*?❄/);
});

test('Player Web bridge preserves public freeze through presence-only updates without exposing private effects', () => {
  assert.match(gmwwMembersLiveScript, /const villageFrozenState=new Map\(\)/);
  assert.match(gmwwMembersLiveScript, /frozen,seatId:/);
  assert.doesNotMatch(gmwwMembersLiveScript.slice(gmwwMembersLiveScript.indexOf('function villagePublicPlayers'), gmwwMembersLiveScript.indexOf('function ensureDesktopResponsiveStyle')), /ownEffects[^;]*dead[^;]*frozen[^;]*out\.push\(\{[^}]*effects:/);
  assert.match(page, /village\.css\?v=303&amp;status=freeze1|village\.css\?v=303&status=freeze1/);
  assert.match(page, /village\.mjs\?v=fire3101&amp;status=freeze1|village\.mjs\?v=fire3101&status=freeze1/);
  assert.doesNotThrow(() => new Function(gmwwMembersLiveScript.replaceAll('__GMWW_WEB_VERSION__', 'V3.106')));
});
