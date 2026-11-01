import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(p,'utf8');
const native=read('.github/workflows/build-server-game-ipa.yml');
const ota=read('.github/scripts/prepare-update-channel.mjs');
const verifier=read('.github/scripts/verify-native-web.mjs');
const worker=read('src/index.js');
const gm=read('server-game/current/app.js');
const source=read('server-game/src/00-core-and-library.part');
const audio=read('server-game/src/10-library-and-settings.part');
const project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
test('native IPA and manual OTA ship only current action-icon V3 assets',()=>{
 assert.ok(native.includes('cp -R server-game/current/action-icons/v3 "$APPDIR/Web/action-icons/v3"'));
 assert.ok(!native.includes('cp -R server-game/current/action-icons "$APPDIR/Web/action-icons"'));
 assert.ok(ota.includes("copyDir('server-game/current/action-icons/v3','action-icons/v3')"));
 assert.ok(!ota.includes("copyDir('server-game/current/action-icons','action-icons')"));
 assert.ok(verifier.includes('Obsolete native icon folder'));
 assert.ok(verifier.includes('V3 icon bytes mismatch'));
});
test('all 51 V3 WebP images are identical to Worker copies; V1/V2 remain in repo',()=>{
 const base='server-game/current/action-icons/';
 const names=fs.readdirSync(base+'v3').filter(n=>n.endsWith('.webp'));
 assert.equal(names.length,51);
 for(const file of names){
  const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
  assert.equal(digest(fs.readFileSync(base+'v3/'+file)),digest(fs.readFileSync('assets/action-icons/v3/'+file)),file);
 }
 for(const old of ['sea-v1','v2'])assert.equal(fs.readdirSync(base+old).filter(x=>x.endsWith('.png')).length,49);
});
test('independent IPA shell and current OTA Runtime retain version integrity and rollback',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 const runtime=worker.match(/VERSION="V([0-9.]+)"/)?.[1];
 const shell=worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1];
 assert.ok(runtime&&shell,'Worker must advertise both versions');
 const parts=value=>value.split('.').map(Number);
 const lessOrEqual=(a,b)=>{const aa=parts(a),bb=parts(b);for(let i=0;i<Math.max(aa.length,bb.length);i++){const diff=(aa[i]||0)-(bb[i]||0);if(diff)return diff<0}return true};
 assert.ok(lessOrEqual(shell,runtime),'A deployed OTA Runtime must not precede its native shell');
 assert.equal(pkg.version,runtime+'.0');
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(gm.includes("const VERSION='"+runtime+"'"));
 assert.ok(source.includes("const VERSION='"+runtime+"'"));
 assert.ok(read('server-game/current/GMWW.html').includes('<title>GMWW V'+runtime+'</title>'));
 assert.deepEqual([...project.matchAll(/MARKETING_VERSION = ([0-9.]+);/g)].map(m=>m[1]),[shell,shell]);
 assert.ok(ota.includes('delete:[]'));
 assert.ok(read('server-game/GMWW-Server/GameView.swift').includes('case "rollbackRuntime":'));
});
test('audio list uses multiple-element selectors for every list row',()=>{
 for(const selector of ['data-audio-id','data-system-sound-slot']){
  const value="$$('["+selector+"]').forEach";
  assert.ok(gm.includes(value));
  assert.ok(audio.includes(value));
  assert.ok(!gm.split('\n').some(line=>line.trimStart().startsWith("$('["+selector+"]').forEach")));
 }
});
test('40 characters, fallback motion, all original role images and audio remain',()=>{
 assert.ok(native.includes('cp -R assets/characters/gmww40/. "$APPDIR/Web/characters/gmww40/"'));
 assert.ok(ota.includes("copyDir('assets/characters/gmww40','characters/gmww40')"));
 assert.ok(native.includes('cp -R assets/characters/walk-v263/'));
 assert.ok(native.includes('cp -R assets/characters/walk-v266-left/'));
 assert.ok(native.includes('assets/role-artwork-v251/original'));
 assert.ok(ota.includes('copy(sourceFile,rel)'));
});