import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const src=fs.readFileSync("assets/village/village.mjs","utf8");
test("village runtime source does not contain escaped newline token between statements",()=>{assert.doesNotMatch(src,/\}\u005cn\s*function\s+render\(/);assert.match(src,/function\s+renderPortal\(/);assert.match(src,/function\s+render\(/);});
