import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const source=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');

test('IPA advertises GitHub-first and keeps existing manual updater and rollback',()=>{
  assert.match(swift,/GMWW_NATIVE_GITHUB_OTA=true/);
  assert.match(swift,/GMWW_NATIVE_MANUAL_RUNTIME=true/);
  assert.match(swift,/case "checkGithubRuntime":/);
  assert.match(swift,/case "pickRuntimePackage":/);
  assert.match(swift,/case "rollbackRuntime":/);
  assert.match(swift,/previousRuntimeKey/);
  assert.match(swift,/\.staging-/);
  assert.match(swift,/FileManager\.default\.moveItem\(at: temp, to: final\)/);
});
test('GitHub metadata is strictly official, immutable version-tagged and not latest',()=>{
  assert.match(swift,/api\.github\.com\/repos\/WilliamPham0702\/GMWW-V2\.00\/releases\?per_page=50/);
  assert.match(swift,/!release\.draft && !release\.prerelease/);
  assert.match(swift,/release\.tag_name\.hasPrefix\("gmww-runtime-v"\)/);
  assert.match(swift,/url\.host == "github\.com"/);
  assert.match(swift,/url\.path == "\/WilliamPham0702\/GMWW-V2\.00\/releases\/download\/gmww-runtime-v/);
  assert.match(swift,/latest\.0\.compare\(current,options:\.numeric\) == \.orderedDescending/);
  assert.doesNotMatch(swift,/releases\/latest/);
});
test('Automatic downloader verifies full download checksum and each embedded file',()=>{
  assert.match(swift,/checksum\.range\(of:"\^\[a-f0-9\]\{64\}\$"/);
  assert.match(swift,/try digestFile\(packageURL\) == expectedSHA/);
  assert.match(swift,/sha256\(bytes\) == entry\.sha256\.lowercased\(\)/);
  assert.match(swift,/verifyManualContainer\(temp,expectedSHA:checksum,expectedVersion:version\)/);
  assert.match(swift,/guard offset == UInt64\(fileSize\)/);
  assert.match(swift,/Set\(paths\)\.count == paths\.count/);
  assert.match(swift,/guard safeRelativePath\(entry\.path\)/);
  assert.match(swift,/installRuntime\(manifestObject:verified\.manifest,webView:webView/);
});
test('GitHub network-only fallback cannot bypass checksum rejection',()=>{
  assert.match(swift,/status":"fallback"/);
  assert.match(swift,/GMWWUpdaterIntegrity/);
  assert.match(swift,/integrityFailure":true/);
  assert.match(swift,/domain == NSURLErrorDomain \|\| domain == "GMWWUpdaterNetwork"/);
  assert.match(app,/checkAppUpdate\(\{notify,skipGithub:true\}\)/);
  assert.match(app,/result\.integrityFailure\?"Đã chặn cập nhật/);
  assert.match(app,/gmwwNativePost\("checkGithubRuntime"\)/);
  assert.match(app,/gmwwGithubInstallRequested/);
  assert.match(app,/GMWW_NATIVE_GITHUB_OTA/);
});
test('Runtime generated bundle retains exact source changes',()=>{
  assert.ok(app.includes(source));
});
test('IPA not published automatically as a side effect of this PR',()=>{
  const workflow=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
  assert.doesNotMatch(workflow,/if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\s*\n\s*env:\s*\n\s*GH_TOKEN/);
});
