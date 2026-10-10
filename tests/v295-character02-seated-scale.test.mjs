import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const village=fs.readFileSync("assets/village/village.mjs","utf8");
const villageCss=fs.readFileSync("assets/village/village.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const serverCss=fs.readFileSync("server-game/current/style.css","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

test("Character-02 patch wires Character-02 seated asset on Player Web and GM",()=>{
  assert.match(village,/character-02.*seated-v296\/character-02\/front\.webp/s);
  assert.match(app,/character-02.*seated-v296\/character-02\/front\.webp/s);
  assert.doesNotMatch(village,/NGỒI XẾP BẰNG •/);
  assert.doesNotMatch(app,/NGỒI XẾP BẰNG •/);
});

test("Character-02 patch character scaling affects avatar only",()=>{
  assert.match(villageCss,/\.player \.portrait\.game-character img\{[\s\S]*transform:scale\(var\(--gmww-character-scale,1\)\)/);
  assert.doesNotMatch(villageCss,/\.player \.player-over\{[\s\S]{0,400}scale\(var\(--gmww-character-scale,1\)\)/);
  assert.doesNotMatch(villageCss,/\.player \.player-role\{[\s\S]{0,400}scale\(var\(--gmww-character-scale,1\)\)/);
  assert.match(serverCss,/play-player-avatar img\{[\s\S]*transform:scale\(var\(--gmww-character-scale,1\)\)/);
  assert.doesNotMatch(serverCss,/play-player-over\{[\s\S]{0,300}scale\(var\(--gmww-character-scale,1\)\)/);
});

test("Character-02 patch avoids rebuilding GM player DOM on every unchanged heartbeat",()=>{
  assert.match(app,/playPlayerRenderSignature/);
  assert.match(app,/if\(playerRenderChanged\)renderPlayPlayers\(\)/);
  assert.equal(pkg.version,"3.68.0");
  assert.match(worker,/VERSION="V3\.68"/);
});
