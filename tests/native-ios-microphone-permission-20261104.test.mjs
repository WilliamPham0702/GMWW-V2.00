import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const native=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
const plist=fs.readFileSync('server-game/GMWW-Server/Info.plist','utf8');

test('native iOS declares microphone usage to the operating system',()=>{
 assert.match(plist,/<key>NSMicrophoneUsageDescription<\/key><string>[^<]+<\/string>/);
 assert.doesNotMatch(plist,/<key>NSCameraUsageDescription<\/key>/);
});

test('only verified local GMWW main frame gets WebKit microphone grant',()=>{
 assert.match(native,/requestMediaCapturePermissionFor origin: WKSecurityOrigin/);
 assert.match(native,/type: WKMediaCaptureType/);
 assert.match(native,/guard type == \.microphone else \{ decisionHandler\(\.deny\); return \}/);
 assert.match(native,/origin\.\`protocol\` == "file"/);
 assert.match(native,/frame\.isMainFrame/);
 assert.match(native,/frame\.request\.url\?\.standardizedFileURL == webView\.url\?\.standardizedFileURL/);
 assert.match(native,/isTrustedGMWWMicrophoneDocument\(webView\.url\)/);
 assert.match(native,/decisionHandler\(\.grant\)/);
 assert.match(native,/decisionHandler\(\.prompt\)/);
 assert.match(native,/Bundle\.main\.url\(forResource: "GMWW", withExtension: "html", subdirectory: "Web"\)/);
 assert.match(native,/activeRuntimeHTML\(\)/);
 assert.match(native,/resolvingSymlinksInPath\(\)/);
 assert.doesNotMatch(native,/type == \.camera.*decisionHandler\(\.grant\)/);
});

test('keep one-shot OS permission and existing runtime/IPA mechanism untouched',()=>{
 assert.match(native,/config\.websiteDataStore = \.default\(\)/);
 assert.match(native,/web\.uiDelegate = context\.coordinator/);
 assert.match(native,/webView\.loadFileURL\(runtime, allowingReadAccessTo:/);
 assert.match(native,/webView\.loadFileURL\(bundled, allowingReadAccessTo:/);
 assert.doesNotMatch(native,/requestRecordPermission\(.*true/);
});
