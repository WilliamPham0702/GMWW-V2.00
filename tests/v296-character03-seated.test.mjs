import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync("server-game/current/app.js","utf8");
const village=fs.readFileSync("assets/village/village.mjs","utf8");

test("Character-03 seated sprite is wired on GM and Player Web",()=>{
  assert.match(app,/character-03.*seated-v296\/character-03\/front\.webp/s);
  assert.match(village,/character-03.*seated-v296\/character-03\/front\.webp/s);
  assert.doesNotMatch(app,/NGỒI XẾP BẰNG •/);
  assert.doesNotMatch(village,/NGỒI XẾP BẰNG •/);
});
