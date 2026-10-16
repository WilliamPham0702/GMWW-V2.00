import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('server-game/current/GMWW.html', 'utf8');
const app = fs.readFileSync('server-game/current/app.js', 'utf8');
const exportJs = fs.readFileSync('server-game/current/gmww-local-export.js', 'utf8');

test('V3.117 export button sits in the update section and not in the template library', () => {
  assert.match(html, /<button class="settings-action settings-action-server" id="exportLocalData"/);
  assert.ok(html.indexOf('id="exportLocalData"') > html.indexOf('id="settingsGroupUpdate"'));
  assert.doesNotMatch(html, /exportGameCards/);
});

test('V3.117 export module loads before app.js', () => {
  assert.ok(html.indexOf('gmww-local-export.js') > -1);
  assert.ok(html.indexOf('gmww-local-export.js') < html.indexOf('app.js?v='));
});

test('V3.117 export handler reads local data and uses the GM API only for server reads', () => {
  const block = app.slice(app.indexOf('async function exportLocalGameData'), app.indexOf('function renderGameTemplateLibrary'));
  assert.match(block, /localStorage\.key\(i\)/);
  assert.match(block, /gmApi\('\/api\/gm\/game-templates'\)/);
  assert.match(block, /gmApi\('\/api\/gm\/artifacts\/shared'\)/);
  assert.match(app, /exportLocalBtn\.onclick=\(\)=>exportLocalGameData\(\)/);
  assert.doesNotMatch(block, /GM_SYNC_TOKEN|Bearer/);
});

test('V3.117 export is packaged in the OTA channel', () => {
  const prep = fs.readFileSync('.github/scripts/prepare-update-channel.mjs', 'utf8');
  assert.match(prep, /copy\('server-game\/current\/gmww-local-export\.js','gmww-local-export\.js'\)/);
});

function loadBuilder() {
  const ctx = { globalThis: null };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(exportJs, ctx);
  return ctx.gmwwBuildLocalExport;
}

test('builder marks legacy templates missing from server as unsynced', () => {
  const build = loadBuilder();
  const out = build({
    app: 'GMWW test',
    localStorage: [{ key: 'GMWW_V109_STATE', value: '{}' }, { key: 'GMWW_V264_PLAY_SCENE', value: '{"a":1}' }],
    serverTemplates: [{ id: 'tpl-1', name: 'Có trên server', revision: 2 }],
    legacyTemplates: [
      { id: 'tpl-1', name: 'Có trên server', roleCount: 5, source: 'GMWW_V109_STATE' },
      { id: 'tpl-2', name: 'Chỉ ở máy', roleCount: 7, source: 'GMWW_V109_STATE' },
    ],
    serverArtifacts: { ok: true, artifacts: [] },
  });
  assert.equal(out.summary.localStorageKeys, 2);
  assert.equal(out.summary.legacyTemplatesUnsynced, 1);
  assert.equal(out.unsyncedTemplates[0].id, 'tpl-2');
  assert.equal(out.localStorage.GMWW_V264_PLAY_SCENE, '{"a":1}');
  assert.equal(out.serverTemplates.length, 1);
  assert.equal(out.errors.length, 0);
});

test('builder replaces binary data with size only and records server errors', () => {
  const build = loadBuilder();
  const out = build({
    localStorage: [],
    indexedDB: [{ name: 'GMWW_ASSETS_921', stores: { slots: [{ key: 'a', value: { __blob: true, type: 'image/webp', size: 1234 } }] } }],
    serverError: 'Không đọc được danh sách',
  });
  assert.equal(out.summary.indexedDbDatabases, 1);
  assert.equal(out.summary.indexedDbBinaryFiles, 1);
  assert.equal(out.summary.errors, 1);
  assert.equal(out.errors[0], 'Không đọc được danh sách');
});

test('export shows the JSON in-app with share and copy, without a blob download', () => {
  const block = app.slice(app.indexOf('async function exportLocalGameData'), app.indexOf('function renderGameTemplateLibrary'));
  assert.doesNotMatch(block, /createObjectURL|link\.click|\.download=/);
  assert.match(block, /showLocalExportViewer\(/);
  const viewer = app.slice(app.indexOf('function showLocalExportViewer'), app.indexOf('async function exportLocalGameData'));
  assert.match(viewer, /navigator\.share/);
  assert.match(viewer, /navigator\.clipboard\.writeText/);
  assert.match(viewer, /readOnly=true/);
});
