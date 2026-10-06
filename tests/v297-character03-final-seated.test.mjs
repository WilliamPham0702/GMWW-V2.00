import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync("server-game/current/app.js","utf8");
const village=fs.readFileSync("assets/village/village.mjs","utf8");

test("Character-03 uses dedicated transparent seated sprite path",()=>{
  assert.match(app,/character-03.*seated-v297\/character-03\/front\.webp/s);
  assert.match(village,/character-03.*seated-v297\/character-03\/front\.webp/s);
  assert.doesNotMatch(app,/character-03.*seated-v296\/character-03\/front\.webp/s);
  assert.doesNotMatch(village,/character-03.*seated-v296\/character-03\/front\.webp/s);
});
