import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../server-game/current/GMWW.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../server-game/current/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../server-game/current/style.css', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');

test('Trạng Thái is a separate library tab and Hiệu Ứng remains intact', () => {
  assert.match(html, /data-lib="effects"[^>]*>[\s\S]*?Hiệu Ứng/);
  assert.match(html, /id="lib-effects"[\s\S]*?id="effectGrid"/);
  assert.match(html, /data-lib="statuses"[^>]*>[\s\S]*?Trạng Thái/);
  assert.match(html, /id="lib-statuses"[\s\S]*?Đóng Băng/);
  assert.match(html, /id="statusLibraryGrid"/);
});

test('freeze is shown as an ice overlay on the existing character token', () => {
  assert.match(css, /play-player-token\.is-frozen \.play-player-avatar:before/);
  assert.match(css, /play-player-token\.is-frozen \.play-player-avatar:after[\s\S]*?❄/);
  assert.match(app, /function playPlayerEffect\(loginId\)/);
  assert.match(app, /Date\.parse\(x\.expiresAt\)>now/);
});

test('GM and Player Web continue to receive server-filtered active statuses', () => {
  assert.match(server, /effectTypes=new Set\(\[\"frozen\",\"expelled\",\"dead\",\"assassin_mark\"\]\)/);
  assert.match(server, /Date\.parse\(x\.expiresAt\)>Date\.now\(\)/);
  assert.match(server, /activeEffects/);
  assert.match(server, /const effects=Object\.values\(latest\)/);
});
