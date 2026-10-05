import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Update Manager settings UI is present',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/id="updateManagerCard"/);
  assert.match(html,/id="installRuntimeUpdate"/);
  assert.match(html,/id="downloadNewIPA"/);
  assert.match(html,/id="syncPlayerWebUpdate"/);
  assert.match(html,/CẬP NHẬT/);
  assert.match(html,/TẢI IPA/);
  assert.match(html,/ĐỒNG BỘ/);
  assert.match(html,/update-actions-three/);
});

test('Update Manager JS has runtime and IPA paths',()=>{
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(js,/function checkAppUpdate/);
  assert.match(js,/function installRuntimeUpdate/);
  assert.match(js,/function downloadUpdateIPA/);
  assert.match(js,/function updateDataNow/);
  assert.match(js,/function syncPlayerWebUpdate/);
  assert.match(js,/gmwwUpdater/);
  assert.match(js,/\/api\/gm\/web-sync\?ts=/);
  assert.match(js,/Authorization:'Bearer '\+GMWW_GM_AUTH/);
});

test('Player Web has new-version reload notification',()=>{
  const live=fs.readFileSync('src/gmww-members-live.js','utf8');
  assert.match(live,/GMWW_WEB_VERSION/);
  assert.match(live,/Có cập nhật mới trên Player Web/);
  assert.match(live,/checkWebUpdate/);
  assert.match(live,/GMWW_WEB_SYNC_KEY/);
  assert.match(live,/\/api\/web-sync\?webUpdate=/);
});

test('Worker exposes update manifest endpoint',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/\/api\/update\/manifest/);
  assert.match(worker,/webVersion:VERSION/);
  assert.match(worker,/\/api\/gm\/web-sync/);
  assert.match(worker,/\/api\/web-sync/);
});

test('Native shell contains updater bridge and SHA-256 verification',()=>{
  const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
  assert.match(swift,/WKScriptMessageHandler/);
  assert.match(swift,/gmwwUpdater/);
  assert.match(swift,/SHA256\.hash/);
  assert.match(swift,/downloadIPA/);
  assert.match(swift,/installRuntime/);
});


test('Update channel never downgrades a native release on same-version follow-up commits',()=>{
  const script=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  assert.match(script,/typeRank=\{server_only:0,runtime:1,native:2\}/);
  assert.match(script,/previousManifest\?\.releaseVersion===version/);
  assert.match(script,/previousType/);
  assert.match(script,/releaseType==='server_only'&&version!==shell/);
});


test('V2.78 update actions stay visible in one three-column row and IPA has shell fallback',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(html,/update-actions-three/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(html,/id="installRuntimeUpdate"[^>]*hidden/);
  assert.doesNotMatch(html,/id="downloadNewIPA"[^>]*hidden/);
  assert.match(js,/fallbackVersion/);
  assert.match(js,/GMWW-V'\+fallbackVersion\+'\.ipa/);
  assert.match(js,/setTimeout\(\(\)=>checkAppUpdate\(\{notify:false\}\),1400\)/);
});
