import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
const src=fs.readFileSync('server-game/current/artifact-sea-import.js','utf8');
function importer(){
  const window={};
  const picker={onchange:null},start={onclick:null};
  const document={getElementById:id=>id==='seaArtifactImportFile'?picker:id==='seaArtifactImportStart'?start:null};
  vm.runInNewContext(src,{window,document,TextDecoder,DataView,Uint8Array,Blob,crypto:webcrypto,URL});
  return window.GMWWSeaArtifactImporter;
}
function makeZip(entries){
  return Buffer.concat(entries.map(([name,data])=>{
    const title=Buffer.from(name,'utf8'),raw=Buffer.from(data),header=Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(0,6);header.writeUInt16LE(0,8);
    header.writeUInt32LE(raw.length,18);header.writeUInt32LE(raw.length,22);
    header.writeUInt16LE(title.length,26);return Buffer.concat([header,title,raw]);
  }));
}
function makePack(changed=false){
  const entries=[],items=[];
  for(let i=0;i<44;i++){
    const b=Buffer.alloc(1100, i%255),name='img-'+i+'.webp';
    items.push({webp:name,sha256:createHash('sha256').update(b).digest('hex'),suggestedArtifactName:'Artifact '+i});
    entries.push(['artworks/'+name,b]);
  }
  if(changed)entries[9][1]=Buffer.alloc(1100,253);
  entries.push(['manifest.json',JSON.stringify({themeId:'theme-sea',imageCount:44,items})]);
  const bytes=makeZip(entries);
  return {name:'redblue-sea.zip',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};
}
test('Sea Artifact importer requires 44 verified SHA-256 images before touching state',async()=>{
  const fn=importer();
  const result=await fn.parse(makePack());
  assert.equal(result.length,44);
  assert.equal(result[0].artifactId,'');
  assert.equal(result[0].blob.type,'image/webp');
  await assert.rejects(fn.parse(makePack(true)),/SHA-256/);
});
test('Sea Artifact importer disallows unknown / incomplete or encrypted ZIPs',async()=>{
  const fn=importer();
  const bytes=makeZip([['manifest.json',JSON.stringify({themeId:'theme-sea',imageCount:44,items:[]})]]);
  const invalid={name:'bad.zip',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};
  await assert.rejects(fn.parse(invalid),/Không phải bộ 44/);
  await assert.rejects(fn.parse({name:'bad.zip',size:25000001}),/tối đa 25 MB/);
});
test('Production GM theme ships bulk importer without changing role/card metadata',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/seaArtifactImportFile/);
  assert.match(html,/seaArtifactImportStart/);
  assert.match(html,/artifact-sea-import\.js\?v=sea-44-1/);
  assert.match(src,/sea-artifact-44-backup\|/);
  assert.match(src,/playSyncSharedArtifactLibrary\(\{onlyIds:ids,forceIds:ids\}\)/);
});
