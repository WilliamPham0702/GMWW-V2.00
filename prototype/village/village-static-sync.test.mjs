import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const names=["index.html","village.css","village-art.css","village.mjs","village-camera.mjs","village-room.mjs","assets/village-coast.svg","assets/avatar-chibi.svg","assets/campfire.svg"];
for(const name of names){
 const [src,staged]=await Promise.all([readFile(new URL("./"+name,import.meta.url)),readFile(new URL("../../assets/village/"+name,import.meta.url))]);
 assert.deepEqual(staged,src,"Staged Cloudflare asset differs: "+name);
}
console.log("Cloudflare static village bundle: PASS (all 9 files match source)");
