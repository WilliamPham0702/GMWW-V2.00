import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync("server-game/current/app.js","utf8");
const village=fs.readFileSync("assets/village/village.mjs","utf8");
const svg=fs.readFileSync("assets/characters/seated-v299/character-04/front.svg","utf8");

test("Character-04 seated sprite is self-contained and mapped on GM + Player Web",()=>{
  assert.match(app,/character-04.*seated-v299\/character-04\/front\.svg/s);
  assert.match(village,/character-04.*seated-v299\/character-04\/front\.svg/s);
  assert.match(svg,/data:image\/webp;base64,/);
  assert.doesNotMatch(svg,/href="\/characters\/walk-v263\/character-04\/frame-01\.webp"/);
  assert.match(svg,/clipPath id="leftLeg"/);
  assert.match(svg,/clipPath id="rightLeg"/);
});
