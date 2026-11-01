import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const plist=readFileSync('server-game/GMWW-Server/Info.plist','utf8');
const native=readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
const project=readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');

test('PR743: IPA declares microphone purpose exactly once and only for user-initiated voice messages',()=>{
  assert.equal((plist.match(/<key>NSMicrophoneUsageDescription<\/key>/g)||[]).length,1);
  const purpose=plist.match(/<key>NSMicrophoneUsageDescription<\/key>\s*<string>([^<]+)<\/string>/);
  assert.ok(purpose,'Microphone purpose string must be present in the signed app Info.plist');
  assert.match(purpose[1],/microphone/i);
  assert.match(purpose[1],/chủ động ghi và gửi tin nhắn thoại/);
  assert.doesNotMatch(plist,/NSCameraUsageDescription/,'Do not expand permission to camera');
});

test('PR743: native WebKit retains the system consent prompt instead of silently granting capture',()=>{
  assert.match(native,/class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate/);
  assert.doesNotMatch(native,/requestMediaCapturePermissionFor[\s\S]{0,400}decisionHandler\(\.grant\)/);
  assert.match(native,/loadFileURL\(runtime, allowingReadAccessTo:/,'Retain existing OTA load path');
});

test('PR743: original native identity and shell version remain unchanged',()=>{
  assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER = com\.gmww\.v2\.server/);
  assert.match(project,/CURRENT_PROJECT_VERSION = 3264/);
  assert.match(plist,/<key>CFBundleShortVersionString<\/key>/);
});
