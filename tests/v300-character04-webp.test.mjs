import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const b=fs.readFileSync("assets/characters/seated-v300/character-04/front.webp");
test("Character-04 fixed seated asset is a real WebP and not an SVG composite",()=>{
  assert.equal(b.subarray(0,4).toString("ascii"),"RIFF");
  assert.equal(b.subarray(8,12).toString("ascii"),"WEBP");
  assert.ok(b.length>10000);
});
