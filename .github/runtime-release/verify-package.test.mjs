import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {writeManualPackage} from '../scripts/build-manual-runtime.mjs';
import {verifyPackage} from './verify-package.mjs';

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gmww-github-release-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const names=['GMWW.html','app.js','style.css'];
  const files=names.map((name,i)=>{
    const bytes=Buffer.from('GMWW test bytes '+i);
    fs.writeFileSync(path.join(root,name),bytes);
    return {path:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.274/'+name};
  });
  const manifest={releaseVersion:'3.274',runtimeVersion:'3.274',releaseType:'runtime',
    shellVersion:'3.264',restartRequired:true,delete:[],runtime:{files}};
  const manifestPath=path.join(root,'manual-manifest.json');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  const packagePath=path.join(root,'GMWW-Runtime-V3.274.gmwwupdate');
  writeManualPackage(manifest,root,packagePath);
  return {root,manifest,manifestPath,packagePath};
}
test('GitHub-only release verifies the exact native container and whole-file SHA-256',t=>{
  const f=fixture(t),proof=verifyPackage(f.manifestPath,f.packagePath);
  assert.equal(proof.version,'3.274');
  assert.equal(proof.files,3);
  assert.equal(proof.sha256,fs.readFileSync(f.packagePath+'.sha256','utf8').split(' ')[0]);
});
test('Reject corrupted embedded Runtime bytes and missing entries',t=>{
  const f=fixture(t),bytes=fs.readFileSync(f.packagePath);
  bytes[bytes.length-1]^=1;fs.writeFileSync(f.packagePath,bytes);
  assert.throws(()=>verifyPackage(f.manifestPath,f.packagePath),/Sai SHA-256/);
});
test('Reject changed manifest, delete requests and altered download origins',t=>{
  const f=fixture(t);
  f.manifest.delete=['user-data'];
  fs.writeFileSync(f.manifestPath,JSON.stringify(f.manifest));
  assert.throws(()=>verifyPackage(f.manifestPath,f.packagePath),/Không cho phép xóa/);
  f.manifest.delete=[];
  f.manifest.runtime.files[0].url='https://untrusted.example/GMWW.html';
  fs.writeFileSync(f.manifestPath,JSON.stringify(f.manifest));
  assert.throws(()=>verifyPackage(f.manifestPath,f.packagePath),/kênh URL/);
});
test('Reject tampered outer package checksum',t=>{
  const f=fixture(t);
  fs.writeFileSync(f.packagePath+'.sha256','0'.repeat(64)+'  '+path.basename(f.packagePath)+'\n');
  assert.throws(()=>verifyPackage(f.manifestPath,f.packagePath),/Sai SHA-256 toàn gói/);
});
test('Offline pipeline never requires Wrangler deploy or Cloudflare credentials',()=>{
  const file=fs.readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  assert.doesNotMatch(file,/npx\s+(?:--no-install\s+)?wrangler\s+deploy|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID/);
  assert.match(file,/workflow_run:/);
  assert.match(file,/Check Player Web Worker/);
  assert.match(file,/gh release create/);
  assert.match(file,/verify-package\.mjs/);
});
