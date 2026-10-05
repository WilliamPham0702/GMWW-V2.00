import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Update Manager settings UI is present',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/id="updateManagerCard"/);
  assert.match(html,/id="installRuntimeUpdate"/);
  assert.match(html,/id="downloadNewIPA"/);
});

test('Update Manager JS has runtime and IPA paths',()=>{
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(js,/function checkAppUpdate/);
  assert.match(js,/function installRuntimeUpdate/);
  assert.match(js,/function downloadUpdateIPA/);
  assert.match(js,/gmwwUpdater/);
});

test('Player Web has new-version reload notification',()=>{
  const live=fs.readFileSync('src/gmww-members-live.js','utf8');
  assert.match(live,/GMWW_WEB_VERSION/);
  assert.match(live,/Có cập nhật mới trên Player Web/);
  assert.match(live,/checkWebUpdate/);
});

test('Worker exposes update manifest endpoint',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/\/api\/update\/manifest/);
  assert.match(worker,/webVersion:VERSION/);
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
});
