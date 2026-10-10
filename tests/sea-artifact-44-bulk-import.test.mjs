import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/current/sea-artifact-zip-import.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
new vm.Script(source);
const from=source.indexOf('function readStoredZip(buffer){');
const to=source.indexOf('async function verifyZipImage(data,hash){',from);
assert.ok(from>=0&&to>from);
const parse=vm.runInNewContext(source.slice(from,to)+';readStoredZip',{TextDecoder,Uint8Array,DataView,Map,JSON,Error});

function storedZip(fileEntries){
  let offset=0;const locals=[],central=[];
  for(const [name,content] of fileEntries){
    const n=Buffer.from(name,'utf8'),b=Buffer.isBuffer(content)?content:Buffer.from(content);
    const local=Buffer.alloc(30),entry=Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
    local.writeUInt32LE(b.length,18);local.writeUInt32LE(b.length,22);local.writeUInt16LE(n.length,26);
    entry.writeUInt32LE(0x02014b50,0);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);
    entry.writeUInt32LE(b.length,20);entry.writeUInt32LE(b.length,24);
    entry.writeUInt16LE(n.length,28);entry.writeUInt32LE(offset,42);
    locals.push(local,n,b);central.push(entry,n);offset+=30+n.length+b.length;
  }
  const dir=Buffer.concat(central),tail=Buffer.alloc(22);
  tail.writeUInt32LE(0x06054b50,0);tail.writeUInt16LE(fileEntries.length,8);
  tail.writeUInt16LE(fileEntries.length,10);tail.writeUInt32LE(dir.length,12);tail.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,dir,tail]);
}

test('GMWW renders the offline-capable 44-artwork importer in Sea theme',()=>{
  assert.match(html,/sea-artifact-zip-import\.js/);
  assert.match(html,/sea-artifact-zip-import\.css/);
  assert.match(source,/playSyncSharedArtifactLibrary\(\{onlyIds:selected,forceIds:selected\}\)/);
  assert.match(source,/gmApi\('\/api\/gm\/artifacts\/shared'/);
  assert.match(source,/playSharedArtifactSignature\(artifact\)/);
  assert.match(source,/state\.themes\.activeId='theme-sea'/);
  assert.match(source,/oldDisplay=await dbGet\(dk\)/);
});

test('Sea ZIP parser reads 44 UTF-8 WebP files from ZIP_STORED with manifest',()=>{
  const items=Array.from({length:44},(_,i)=>({
    webp:'ảnh_artifact_'+String(i+1).padStart(2,'0')+'.webp',
    sha256:'0'.repeat(64),suggestedArtifactName:'Artifact '+(i+1)
  }));
  const manifest={themeId:'theme-sea',imageCount:44,sourceFolder:'GMWW-V2-ASSETS/Artifact-44-Moi-RedBlue-KhongBangTen',items};
  const files=items.map(x=>['artworks/'+x.webp,Buffer.alloc(3300,65)]);
  files.push(['manifest.json',JSON.stringify(manifest)]);
  const buf=storedZip(files),input=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  const result=parse(input);
  assert.equal(result.entries.size,45);
  assert.equal(result.manifest.items.length,44);
  assert.ok(result.entries.get('artworks/'+items[1].webp).length===3300);
});

test('Sea ZIP parser rejects incomplete sets before any IndexedDB writes',()=>{
  const bad=storedZip([['manifest.json',JSON.stringify({themeId:'theme-sea',imageCount:44,items:[]})]]);
  assert.throws(()=>parse(bad.buffer.slice(bad.byteOffset,bad.byteOffset+bad.byteLength)));
});
