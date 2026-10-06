import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const html=fs.readFileSync("assets/village/index.html","utf8"),js=fs.readFileSync("assets/village/village.mjs","utf8");
test("OFFLINE village hides ONLINE discussion chat and voice panel",()=>{assert.match(html,/id="onlinePanel"/);assert.match(js,/room\.roomMode/);assert.match(js,/===\"offline\"/);assert.match(js,/onlinePanel\.hidden=offline/);assert.match(js,/room-offline/);});
