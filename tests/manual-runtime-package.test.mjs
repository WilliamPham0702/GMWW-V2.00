import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const modulePath='../.github/scripts/build-manual-runtime.mjs';
test('manual runtime packager validates bytes, missing entry points and unsafe paths',async()=>{
 assert.ok(fs.existsSync(new URL(modulePath,import.meta.url)),'manual packager must exist');
 const {buildManualPackage,writeManualPackage}=await import(modulePath);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gmww-manual-'));
 try{
  const files=['GMWW.html','app.js','style.css'].map(p=>{fs.writeFileSync(path.join(root,p),'fixture '+p);return {path:p,url:'https://gmww-v2-00.williampham0702.workers.dev/'+p,sha256:createHash('sha256').update('fixture '+p).digest('hex')}});
  const manifest={runtimeVersion:'3.257',minimumShellVersion:'3.110',runtime:{files}};
  const pkg=buildManualPackage(manifest,root);
  assert.equal(pkg.format,'gmww-runtime-2');
  const output=path.join(root,'test.gmwwupdate');
  writeManualPackage(manifest,root,output);
  const bytes=fs.readFileSync(output),magic=Buffer.from('GMWWRUNTIME2\n');
  assert.ok(bytes.subarray(0,magic.length).equals(magic));
  const headerLength=bytes.readUInt32BE(magic.length);
  const header=JSON.parse(bytes.subarray(magic.length+4,magic.length+4+headerLength));
  assert.equal(header.format,'gmww-runtime-2');
  let offset=magic.length+4+headerLength;
  for(const item of header.manifest.runtime.files){
   const length=header.lengths[item.path];
   assert.equal(bytes.subarray(offset,offset+length).toString(),'fixture '+item.path);offset+=length;
  }
  assert.equal(offset,bytes.length);
  fs.writeFileSync(path.join(root,'app.js'),'corrupt');
  assert.throws(()=>buildManualPackage(manifest,root),/SHA-256/);
  assert.throws(()=>buildManualPackage({...manifest,runtime:{files:[{...files[0],path:'../escape'}]}},root),/path|entry/i);
  assert.throws(()=>buildManualPackage({...manifest,runtime:{files:files.slice(0,1)}},root),/entry/i);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('all four update actions occupy one row and old shells get an honest fallback',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const row=html.match(/<div class="[^"]*update-actions-four[^\"]*">([\s\S]*?)<\/div>/)?.[1]||'';
 for(const id of ['installRuntimeUpdate','installManualRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate'])assert.ok(row.includes('id="'+id+'"'),id);
 assert.ok(row.includes('TỰ ĐỘNG'));
});
test('manual action never posts to an unsupported shell and blocks duplicate requests',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
 const fn=source.slice(source.indexOf('function installManualRuntimeUpdate(){'),source.indexOf('async function installRuntimeUpdate(){'));
 const calls=[],ui=[];
 const ctx={window:{},gmwwUpdateBusy:false,gmwwNativePost:a=>{calls.push(a);return true},setUpdateUi:(...a)=>ui.push(a),gmwwSetUpdateProgress:()=>{}};
 runInNewContext(fn,ctx);
 assert.equal(ctx.installManualRuntimeUpdate(),false);assert.equal(calls.length,0);assert.match(ui[0][2],/IPA/);
 ctx.window.GMWW_NATIVE_MANUAL_RUNTIME=true;
 assert.equal(ctx.installManualRuntimeUpdate(),true);assert.deepEqual(calls,['pickRuntimePackage']);
 assert.equal(ctx.installManualRuntimeUpdate(),false);assert.equal(calls.length,1);
});

test('native asset validator skips the special about:blank document without hiding actual missing assets',()=>{
 const validator=fs.readFileSync('.github/scripts/verify-native-web.mjs','utf8');
 assert.match(validator,/ref==='about:blank'/);
 assert.match(validator,/requireFile\(ref\)/);
});

test('the manual update native shell version matches the release and Xcode baseline',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 const project=fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
 const shell=worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1];
 const runtime=worker.match(/VERSION="V([0-9.]+)"/)?.[1];
 assert.equal(shell,runtime,'manual picker changes require a new IPA shell');
 assert.deepEqual([...project.matchAll(/MARKETING_VERSION = ([0-9.]+);/g)].map(m=>m[1]),[shell,shell]);
});
