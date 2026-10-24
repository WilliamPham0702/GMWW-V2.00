#!/usr/bin/env node
// Validate an OTA candidate entirely offline; NEVER deploy or mutate Production.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const version=String(process.argv[2]||'3.203');
const root=path.join('assets','updates','runtime','V'+version);
const manifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'));
if(manifest.releaseVersion!==version||manifest.runtimeVersion!==version||manifest.releaseType!=='runtime')
  throw Error('Sai phiên bản hoặc kênh Runtime OTA');
if(manifest.shellVersion!=='3.110')throw Error('Không được thay IPA shell');
if(!Array.isArray(manifest.runtime?.files)||!manifest.runtime.files.length||manifest.delete?.length)
  throw Error('Manifest OTA thiếu danh mục hoặc có lệnh xóa');
const seen=new Set();
for(const entry of manifest.runtime.files){
  const rel=String(entry.path||'');
  if(!rel||path.posix.isAbsolute(rel)||rel.split('/').some(part=>!part||part==='..'||part==='.')||seen.has(rel))
    throw Error('Đường dẫn trùng/không hợp lệ: '+rel);
  seen.add(rel);
  const data=fs.readFileSync(path.join(root,rel));
  const sha=crypto.createHash('sha256').update(data).digest('hex');
  if(entry.sha256!==sha)throw Error('SHA-256 không khớp: '+rel);
  const url='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V'+version+'/'+rel.split('/').map(encodeURIComponent).join('/');
  if(entry.url!==url)throw Error('Đường dẫn tải OTA không khớp: '+rel);
}
for(const rel of ['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp'])
  if(!seen.has(rel))throw Error('Thiếu file Runtime: '+rel);
const canonical=fs.readFileSync(path.join(root,'manifest.json'));
if(JSON.stringify(JSON.parse(canonical))!==JSON.stringify(manifest))throw Error('Manifest và latest.json không khớp');
const record={releaseVersion:version,nativeShell:'3.110',releaseType:'runtime',
  fileCount:seen.size,manifestSha256:crypto.createHash('sha256').update(canonical).digest('hex'),
  files:manifest.runtime.files.map(file=>({path:file.path,sha256:file.sha256})),status:'PASS',officialRelease:false};
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/gmww-runtime-v'+version+'-sha256.json',JSON.stringify(record,null,2)+'\n');
console.log('PASS V'+version+' — '+seen.size+' file, manifest SHA-256 '+record.manifestSha256);
