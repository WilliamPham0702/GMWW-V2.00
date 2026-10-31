#!/usr/bin/env python3
"""Build a QA-only manual runtime from the SHA-256-pinned V3.284 package.
Does not change Production, IPA, Worker, Oracle, or GitHub Releases.
"""
import json, struct, hashlib, pathlib, sys

root=pathlib.Path(sys.argv[1]).resolve()
original=root/'GMWW-Runtime-V3.284.gmwwupdate'
out=root/'GMWW-Runtime-V3.285.gmwwupdate'
MAGIC=b'GMWWRUNTIME2\n'
expected_hash='5501f03749676b22b18ef03aad86fcaf1a5ad90e2393a5373c4c1889d0e5b9fb'
with original.open('rb') as f:
    old_hash=hashlib.file_digest(f,'sha256').hexdigest()
assert old_hash==expected_hash, 'Untrusted original V3.284 baseline SHA-256'
with original.open('rb') as f:
    assert f.read(len(MAGIC))==MAGIC
    hdr_len=struct.unpack('>I',f.read(4))[0]
    assert 0<hdr_len<2*1024*1024
    h=json.loads(f.read(hdr_len))
assert h['manifest']['runtimeVersion']=='3.284'
files=h['manifest']['runtime']['files']
assert len(files)==276 and len(h['lengths'])==276
assert set(h['lengths'])=={x['path'] for x in files}
original_bytes={}
with original.open('rb') as f:
    f.seek(len(MAGIC)+4+hdr_len)
    for item in files:
        path=item['path']
        data=f.read(h['lengths'][path])
        assert len(data)==h['lengths'][path]
        assert hashlib.sha256(data).hexdigest()==item['sha256'],f'Baseline corrupted: {path}'
        if path in ['GMWW.html','app.js']:
            original_bytes[path]=data
    assert f.read(1)==b'', 'Unexpected trailing bytes'
html=original_bytes['GMWW.html'].decode('utf-8')
old_block='''  // This config MUST only be supplied by an approved, verified domain release.
  // A DNS name mentioned in docs is NOT sufficient to enable the alias.
  function verifiedAlias(){
    const config=window.GMWW_PLAYER_WEB_ALIAS_CONFIG;
    if(!config||config.verified!==true)return '';
    try{
      const parsed=new URL(String(config.url||''));
      if(parsed.protocol!=='https:'||parsed.username||parsed.password||
         parsed.search||parsed.hash||parsed.pathname!=='/'||parsed.origin===new URL(oldUrl).origin)return '';
      return parsed.origin+'/';
    }catch(_){return ''}
  }'''
new_block='''  // Verified GameMaSoi Pages hostname from merged GMWW PR #682 / Pages PR #676.
  // Do not accept arbitrary runtime/global URLs in the GM link selection.
  const approvedAliasUrl='https://gamemasoi.pages.dev/';
  function verifiedAlias(){
    try{
      const parsed=new URL(approvedAliasUrl);
      if(parsed.protocol!=='https:'||parsed.username||parsed.password||
         parsed.search||parsed.hash||parsed.pathname!=='/'||parsed.origin===new URL(oldUrl).origin)return '';
      return parsed.origin+'/';
    }catch(_){return ''}
  }'''
assert html.count(old_block)==1, 'Unexpected GMWW.html share script'
html=html.replace(old_block,new_block)
assert html.count('id="gmwwShareAliasLabel">Chưa kích hoạt</small>')==1
html=html.replace('id="gmwwShareAliasLabel">Chưa kích hoạt</small>',
                  'id="gmwwShareAliasLabel">https://gamemasoi.pages.dev/</small>')
assert html.count('<title>GMWW V3.284</title>')==1
html=html.replace('<title>GMWW V3.284</title>','<title>GMWW V3.285</title>')
share=html[html.index('/* BEGIN GMWW_PLAYER_SHARE_SCRIPT */'):html.index('/* END GMWW_PLAYER_SHARE_SCRIPT */')]
assert 'GMWW_PLAYER_WEB_ALIAS_CONFIG' not in share
assert "const oldUrl='https://gmww-v2-00.williampham0702.workers.dev/'" in share
assert "const approvedAliasUrl='https://gamemasoi.pages.dev/'" in share
app=original_bytes['app.js'].decode('utf-8')
assert app.count("const VERSION='3.284'")==1
app=app.replace("const VERSION='3.284'","const VERSION='3.285'",1)
patched={'GMWW.html':html.encode('utf-8'),'app.js':app.encode('utf-8')}
manifest=h['manifest']
for key in ['releaseVersion','runtimeVersion','webVersion']:
    assert manifest[key]=='3.284'
    manifest[key]='3.285'
manifest['serverVersion']='3.280'
manifest['message']='Có bản Runtime V3.285 thử nghiệm thủ công. Server vẫn đang V3.280; chưa xác nhận đồng bộ.'
manifest['releaseNotes']=[
 'V3.285 CANDIDATE PR682: Trong Cài đặt → Chia sẻ Player Web, kích hoạt Link mới https://gamemasoi.pages.dev/; giữ Link hiện tại workers.dev, hỗ trợ Sao chép/Gửi link và ghi nhớ lựa chọn. Bảo toàn đầy đủ Runtime V3.284 đã xác minh SHA-256, không đổi IPA/Oracle/dữ liệu.',
 'CHƯA TRIỂN KHAI OTA PRODUCTION: Server vẫn có thể là V3.280. Không tuyên bố ĐÃ ĐỒNG BỘ; đây là gói ứng viên thủ công từ Runtime V3.284, chưa được CI GitHub phát hành.'
]+manifest['releaseNotes']
assert manifest['shellVersion']=='3.264', 'Must preserve native shell'
assert manifest['releaseType']=='runtime'
for x in files:
    x['url']=x['url'].replace('/V3.284/','/V3.285/')
    if x['path'] in patched:
        x['sha256']=hashlib.sha256(patched[x['path']]).hexdigest()
        h['lengths'][x['path']]=len(patched[x['path']])
head_data=json.dumps(h,ensure_ascii=False,separators=(',',':')).encode('utf-8')
assert len(head_data)<2*1024*1024
with original.open('rb') as old, out.open('wb') as new:
    old.seek(len(MAGIC)+4+hdr_len)
    new.write(MAGIC);new.write(struct.pack('>I',len(head_data)));new.write(head_data)
    for x in files:
        path=x['path']
        buf=old.read(len(original_bytes[path]) if path in original_bytes else h['lengths'][path])
        if path in patched:
            assert buf==original_bytes[path]
            buf=patched[path]
        assert len(buf)==h['lengths'][path]
        assert hashlib.sha256(buf).hexdigest()==x['sha256'],f'New checksum mismatch: {path}'
        new.write(buf)
    assert old.read(1)==b''
with out.open('rb') as f:
    sha=hashlib.file_digest(f,'sha256').hexdigest()
assert sha=='53515d3e5f82b63f90f909d32ba97257f1f8eebb05ef49335b8b42eb285ff361', 'QA artifact differs from candidate verified outside GitHub'
(out.parent/(out.name+'.sha256')).write_text(sha+'  '+out.name+'\n')
(out.parent/'GMWW-Runtime-V3.285-release-notes-vi.txt').write_text('\n'.join(manifest['releaseNotes'][:2])+'\nRollback: dùng bản V3.284 đã lưu; nếu đã có dữ liệu mới hãy xuất/backup trước. Không thay IPA, Oracle và Production Worker.\n')
print(json.dumps({'sha256':sha,'bytes':out.stat().st_size,'count':len(files),'untouched':274,'changed':['GMWW.html','app.js'],'status':'QA only, no Production deployment'},ensure_ascii=False))
