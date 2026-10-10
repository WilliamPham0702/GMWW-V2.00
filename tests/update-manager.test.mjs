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


test('V2.81 update actions stay visible and IPA download never falls back to an old shell',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(html,/update-actions-three/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(html,/id="installRuntimeUpdate"[^>]*hidden/);
  assert.doesNotMatch(html,/id="downloadNewIPA"[^>]*hidden/);
  assert.match(js,/manifestIpa\.version/);
  assert.match(js,/Server chưa công bố file IPA mới để tải/);
  assert.doesNotMatch(js,/fallbackVersion|fallbackUrl/);
  assert.match(js,/setTimeout\(\(\)=>checkAppUpdate\(\{notify:true\}\),1400\)/);
});


test('Production deploy verifies exact runtime, manifest and web-sync endpoint',()=>{
  const workflow=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(workflow,/EXPECTED=.*package\.json/);
  assert.match(workflow,/EXPECTED_SHELL/);
  assert.match(workflow,/version.*V\$EXPECTED/);
  assert.match(workflow,/api\/update\/manifest/);
  assert.match(workflow,/releaseVersion/);
  assert.match(workflow,/Newer runtime was hidden/);
  assert.match(workflow,/GM rider asset must appear exactly once/);
  assert.match(workflow,/gm\/gm-white-wolf\.webp/);
  assert.match(workflow,/api\/web-sync/);
});


test('Every new version can notify the GM with the required action',()=>{
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(js,/gmwwReleaseNotesText\(manifest\)/);
  assert.match(js,/Có phiên bản IPA V/);
  assert.match(js,/Đồng bộ ngay\?/);
  assert.match(js,/visibilitychange/);
  assert.match(js,/checkAppUpdate\(\{notify:true\}\)/);
});

test('Official native IPA build is isolated to explicit dispatch or native-shell changes',()=>{
  const script=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
  assert.match(script,/version:isNative\?version:shell/);
  assert.match(script,/GMWW-V\$\{isNative\?version:shell\}\.ipa/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/server-game\/BUILD_IPA_REQUEST/);
  // A clean official IPA may rebuild the tested Runtime into a standalone native
  // package without mutating the stable V3.17 Xcode/OTA source baseline.
  assert.match(workflow,/Only this macOS runner's Xcode project receives the version bump/);
  assert.match(workflow,/const version=runtime,build=runtime.replace/);
  assert.match(workflow,/fs.writeFileSync\(projectPath,staged\)/);
  assert.match(workflow,/server-game\/current\/home-art/);
  assert.match(workflow,/test "\$IPA_BYTES" -gt 50000000/);
});

test('Fast Runtime Snapshot reuses a verified native shell and never runs Xcode or publishes official IPA',()=>{
  const workflow=fs.readFileSync('.github/workflows/build-runtime-snapshot-ipa.yml','utf8');
  assert.match(workflow,/baseline_shell:/);
  assert.match(workflow,/gh release download/);
  assert.match(workflow,/prepare-update-channel\.mjs runtime/);
  assert.match(workflow,/Native executable changed during snapshot/);
  assert.match(workflow,/Info\.plist changed during snapshot/);
  assert.doesNotMatch(workflow,/xcodebuild/);
  assert.doesNotMatch(workflow,/gh release create|gh release upload/);
  assert.match(workflow,/official_release=false/);
});

test('Version bumps keep native update channel and web-sync self-heals',()=>{
  const script=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(script,/versionChanged/);
  assert.match(script,/versionChanged&&shell===version/);
  assert.match(worker,/source:"SERVER_DEPLOY"/);
  assert.match(worker,/String\(old\?\.version\|\|""\)!==VERSION/);
});


test('Fresh IPA keeps newer installed runtime and does not request same IPA again',()=>{
  const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(swift,/active\.compare\(shellVersion, options: \.numeric\) == \.orderedAscending/);
  assert.match(js,/shellCurrent=gmwwVersionCompare\(shell,latest\)>=0/);
  assert.match(js,/type==='native'&&shellCurrent/);
  assert.match(js,/ĐÃ CÀI IPA/);
});

test('V3.03 Update Manager keeps all actions available and highlights the recommendation',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const js=fs.readFileSync('server-game/current/app.js','utf8');
 assert.match(html,/id="updateDecisionTitle"/);
 assert.match(html,/id="updateDecisionHint"/);
 assert.match(js,/x\.disabled=false/);
 assert.doesNotMatch(js,/x\.disabled=true/);
 assert.match(js,/classList\.add\('recommended'\)/);
 assert.match(js,/kind==='compatible'/);
 assert.match(js,/Không cần tải IPA mới/);
 assert.match(js,/Bắt buộc cài IPA V/);
 assert.match(js,/Chỉ Player Web\/Server cần đồng bộ/);
});


test('Installed runtime newer than native shell persists across relaunches',()=>{
  const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
  assert.match(swift,/active\.compare\(shellVersion, options: \.numeric\) == \.orderedAscending/);
  assert.doesNotMatch(swift,/active\.compare\(shellVersion, options: \.numeric\) != \.orderedSame/);
});


test('V3.17 channel stays aligned with the V3.17 native shell',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  const prepare=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  assert.match(worker,/validRuntime=/);
  assert.match(worker,/RUNTIME_MANIFEST_NOT_READY/);
  assert.match(worker,/NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-376"/);
  assert.match(prepare,/character-renderer\.js','character-renderer\.js/);
  assert.match(prepare,/character-renderer\.css','character-renderer\.css/);
});


test('Runtime update lookup prefers the immutable versioned manifest before latest.json',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  const route=worker.slice(worker.indexOf('if(url.pathname==="/api/update/manifest"'),worker.indexOf('if((url.pathname==="/favicon.svg"',worker.indexOf('if(url.pathname==="/api/update/manifest"')));
  const versioned=route.indexOf('const versioned=await readVersionedManifest()');
  const latest=route.indexOf('manifestUrl.pathname="/updates/latest.json"');
  assert.ok(versioned>=0&&latest>=0&&versioned<latest);
  assert.ok(route.includes('manifest-"+UPDATE_CHANNEL_REV+".json"'));
  assert.match(route,/if\(validRuntime\(versioned\)&&await runtimeReady\(versioned\)\)return j\(\{ok:true/);
});
