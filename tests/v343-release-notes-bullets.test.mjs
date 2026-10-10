import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
test('Có gì mới shows each note in a dedicated safe bullet',()=>{
 assert.ok(html.includes('class="update-release-list"'));
 assert.ok(html.includes('id="updateReleaseNotes"'));
 const start=app.indexOf('function gmwwReleaseNotesList(');
 const end=app.indexOf('async function checkAppUpdate(',start);
 assert.ok(start>0&&end>start);
 const box={children:[],replaceChildren(...children){this.children=children}};
 const document={getElementById:()=>box,createElement:tag=>({tag,children:[],appendChild(el){this.children.push(el)},textContent:'',className:''})};
 vm.runInNewContext(app.slice(start,end)+"\ngmwwRenderReleaseNotes({releaseVersion:'3.58',releaseNotes:['Nội dung A','Nội dung B']});",{document,gmwwRuntimeVersion:()=> '3.50',gmwwVersionCompare:(a,b)=>a.localeCompare(b,undefined,{numeric:true})});
 assert.equal(box.children[0].textContent,'Có gì mới');
 assert.equal(box.children[1].tag,'ul');
 assert.deepEqual(Array.from(box.children[1].children,x=>x.textContent),['Nội dung A','Nội dung B']);
 assert.ok(css.includes('#settings #updateReleaseNotes .update-release-list'));
 assert.ok(css.includes('max-height:166px;overflow-y:auto'));
});
test('V3.71 is a separate OTA release on IPA 3.17',()=>{
 assert.ok(html.includes('<title>GMWW V3.71</title>'));
 assert.ok(app.includes("const VERSION='3.71'"));
 assert.ok(worker.includes('VERSION="V3.71",NATIVE_SHELL_VERSION="3.17",UPDATE_CHANNEL_REV="runtime-371"'));
});
