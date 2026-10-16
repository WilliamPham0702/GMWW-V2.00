import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('server-game/current/GMWW.html', 'utf8');
const app = fs.readFileSync('server-game/current/app.js', 'utf8');

test('V3.115 GM template library has an in-app export button before the create button', () => {
  assert.match(html, /<button id="exportGameCards" type="button"[^>]*>⬇ XUẤT<\/button><button id="addGameTemplate"/);
});

test('V3.115 export handler reads templates and shared artifacts through the GM API only', () => {
  assert.match(app, /async function exportGameCardsData\(\)/);
  assert.match(app, /gmApi\('\/api\/gm\/game-templates'\)/);
  assert.match(app, /gmApi\('\/api\/gm\/game-templates\/'\+encodeURIComponent\(id\)\)/);
  assert.match(app, /gmApi\('\/api\/gm\/artifacts\/shared'\)/);
  assert.doesNotMatch(app.slice(app.indexOf('async function exportGameCardsData'), app.indexOf('function renderGameTemplateLibrary')), /GM_SYNC_TOKEN|Bearer/);
});

test('V3.115 export button is bound to the export handler', () => {
  assert.match(app, /getElementById\('exportGameCards'\)|\$\('#exportGameCards'\)/);
  assert.match(app, /exportGameCardsBtn\.onclick=\(\)=>exportGameCardsData\(\)/);
});
