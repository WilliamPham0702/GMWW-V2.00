import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateArenaGmContext,arenaGmContextPayload} from '../assets/village/arena-3d/gm-native-bridge.mjs';
const gm=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const native=readFileSync('server-game/current/GMWW.html','utf8');

test('Native GM session accepts only immediate parent origin and validates token shape',()=>{
 const message={kind:'gmww-arena3d-gm-context',roomCode:'ABC123',gmToken:'Avalid-GM_token-1234567890'};
 const okay={origin:'null',expectedOrigin:'https://gmww-v2-00.williampham0702.workers.dev',
   sourceIsParent:true,hasParentFrame:true};
 assert.deepEqual(validateArenaGmContext(message,okay),{
   roomCode:'ABC123',gmToken:message.gmToken
 });
 assert.equal(validateArenaGmContext(message,{...okay,sourceIsParent:false}),null);
 assert.equal(validateArenaGmContext(message,{...okay,hasParentFrame:false}),null);
 assert.equal(validateArenaGmContext(message,{...okay,origin:'https://evil.example'}),null);
 assert.deepEqual(validateArenaGmContext(message,{
   ...okay,origin:okay.expectedOrigin
 }),{roomCode:'ABC123',gmToken:message.gmToken});
 assert.equal(validateArenaGmContext({...message,gmToken:'bad key with whitespace'},okay),null);
 assert.equal(validateArenaGmContext({...message,roomCode:'../ABC'},okay),null);
 assert.equal(validateArenaGmContext({...message,kind:'gmww-arena3d-player'},okay),null);
 assert.deepEqual(arenaGmContextPayload('ABC123',message.gmToken),message);
});
test('GM Arena receives only ephemeral postMessage, revalidates bearer with real Core',()=>{
 assert.match(gm,/event\.source===window\.parent/);
 assert.match(gm,/validateArenaGmContext\(event\.data/);
 assert.match(gm,/await fetch\(privateGmUrl\(bridged\.roomCode\)/);
 assert.match(gm,/if\(!verified\.ok\)throw Error/);
 assert.match(gm,/const state=await verified\.json\(\)/);
 assert.match(gm,/if\(!state\?\.ok\|\|serial!==nativeBridgeSerial\)return/);
 assert.doesNotMatch(gm,/searchParams\.set\(['"](?:gmToken|token|gmKey)['"]/);
 assert.doesNotMatch(gm,/localStorage\.setItem\([^\n]*gmToken/);
});
test('Official VÀO LÀNG routes to same-origin Arena 3D and never places GM token in a URL',()=>{
 assert.match(native,/const arenaUrl='https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/village\/arena-3d\/live\.html'/);
 assert.match(native,/frame\.id='gmwwArena3dQaFrame'/);
 assert.doesNotMatch(native,/const arenaUrl='https:\/\/gmww-arena3d-stage14-staging/);
 assert.doesNotMatch(native,/\?gmToken=|\?gmKey=|\?token=/);
});
