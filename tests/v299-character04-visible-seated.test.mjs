import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync("server-game/current/app.js","utf8");
const village=fs.readFileSync("assets/village/village.mjs","utf8");

test("Character-04 uses the fixed seated WebP asset on GM + Player Web",()=>{
  assert.match(app,/character-04.*seated-v300\/character-04\/front\.webp/s);
  assert.match(village,/character-04.*seated-v300\/character-04\/front\.webp/s);
  assert.doesNotMatch(app,/seated-v299\/character-04\/front\.svg/);
  assert.doesNotMatch(village,/seated-v299\/character-04\/front\.svg/);
});
