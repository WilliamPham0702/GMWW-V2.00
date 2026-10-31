#!/usr/bin/env node
// Offline verification of the *actual* GMWW native manual-update container.
// No Worker, Cloudflare or Production request is made.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const magic=Buffer.from('GMWWRUNTIME2\n');
const hex=/^[a-f0-9]{64}$/i;
function readExactly(fd,bytes,offset) {
  const out=Buffer.alloc(bytes);
  let used=0;
  while(used<bytes) {
    const n=fs.readSync(fd,out,used,bytes-used,offset+used);
    if(!n)throw Error('Gói cập nhật bị cắt ngắn');
    used+=n;
  }
  return out;
}
export function verifyPackage(manifestPath,packagePath) {
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const version=String(manifest.runtimeVersion||'');
  assert.match(version,/^\d+\.\d+(?:\.\d+)?$/,'Phiên bản không hợp lệ');
  assert.equal(manifest.releaseVersion,version);
  assert.equal(manifest.releaseType,'runtime','Chỉ phát hành Runtime, không IPA/Server');
  assert.equal(manifest.restartRequired,true);
  assert.ok(!manifest.delete?.length,'Không cho phép xóa file Runtime');
  const entries=manifest.runtime?.files;
  assert.ok(Array.isArray(entries)&&entries.length,'Thiếu file Runtime');
  const paths=new Set();
  for(const item of entries){
    assert.ok(typeof item.path==='string'&&item.path.length>0&&!path.posix.isAbsolute(item.path)&&
      !item.path.includes('\\')&&item.path.split('/').every(v=>v&&v!=='.'&&v!=='..'),
      'Đường dẫn Runtime không an toàn');
    assert.ok(!paths.has(item.path),'Trùng file Runtime');
    paths.add(item.path);
    assert.match(String(item.sha256||''),hex,'Thiếu SHA-256 từng file');
    const url='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V'+version+'/' +
      item.path.split('/').map(encodeURIComponent).join('/');
    // The existing IPA checks this URL even for locally supplied bytes.
    assert.equal(item.url,url,'Không được đổi kênh URL của IPA hiện tại');
  }
  for(const entry of ['GMWW.html','app.js','style.css'])assert.ok(paths.has(entry),'Thiếu '+entry);
  const fd=fs.openSync(packagePath,'r');
  let offset=0,total=0;
  try{
    const stat=fs.fstatSync(fd);
    assert.ok(stat.size>magic.length+4&&stat.size<=512*1024*1024+2*1024*1024+16);
    assert.ok(readExactly(fd,magic.length,offset).equals(magic),'Sai định dạng GMWWRUNTIME2');
    offset+=magic.length;
    const length=readExactly(fd,4,offset).readUInt32BE(0);offset+=4;
    assert.ok(length>0&&length<=2*1024*1024,'Header quá lớn');
    const header=JSON.parse(readExactly(fd,length,offset).toString('utf8'));offset+=length;
    assert.equal(header.format,'gmww-runtime-2');
    assert.deepEqual(header.manifest,manifest,'Manifest trong gói khác manifest nguồn');
    assert.deepEqual(Object.keys(header.lengths).sort(),[...paths].sort(),'Danh sách file không khớp');
    for(const item of entries){
      const size=header.lengths[item.path];
      assert.ok(Number.isInteger(size)&&size>=0&&size<=16*1024*1024,'Dung lượng file không hợp lệ');
      total+=size;assert.ok(total<=512*1024*1024,'Gói vượt giới hạn');
      const h=crypto.createHash('sha256');
      let remaining=size;
      while(remaining>0){
        const chunk=readExactly(fd,Math.min(remaining,1024*1024),offset);
        h.update(chunk);offset+=chunk.length;remaining-=chunk.length;
      }
      assert.equal(h.digest('hex'),item.sha256.toLowerCase(),'Sai SHA-256 '+item.path);
    }
    assert.equal(offset,stat.size,'Có dữ liệu thừa hoặc gói bị hỏng');
  }finally{fs.closeSync(fd)}
  const checksum=fs.readFileSync(packagePath+'.sha256','utf8').trim();
  const digest=crypto.createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex');
  assert.equal(checksum,digest+'  '+path.basename(packagePath),'Sai SHA-256 toàn gói');
  return {version,files:entries.length,sha256:digest,bytes:offset};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [manifestPath,packagePath]=process.argv.slice(2);
  if(!manifestPath||!packagePath)throw Error('Cần manifest.json và .gmwwupdate');
  const proof=verifyPackage(manifestPath,packagePath);
  console.log('PASS GitHub-only Runtime V'+proof.version+', '+proof.files+' files, SHA-256 '+proof.sha256);
}
