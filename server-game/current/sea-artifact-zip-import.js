/* One-time bulk importer for the approved GMWW Sea Red/Blue artwork ZIP.
 * This runs only on explicit GM input; no changes to existing Artifact definitions
 * or game templates. All identity assignments are reviewable before upload. */
(()=>{
'use strict';
const SEA_IMPORT_ID='gmwwSeaArtifact44BulkImport';
const decoder=new TextDecoder('utf-8');
const $=id=>document.getElementById(id);
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
function errorMessage(error){return String(error?.message||error||'Không xác định')}
function safeHtml(x){return String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function readStoredZip(buffer){
  const bytes=new Uint8Array(buffer),d=new DataView(buffer);
  if(bytes.length<100||bytes.length>65*1024*1024)throw Error('Bộ ZIP phải nhỏ hơn 65MB.');
  const u16=i=>d.getUint16(i,true),u32=i=>d.getUint32(i,true);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(u32(i)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw Error('File không phải ZIP hợp lệ.');
  const count=u16(eocd+10),offset=u32(eocd+16),entries=new Map();
  if(count<45||count>60||offset>=bytes.length)throw Error('Bộ ZIP phải có đủ 44 ảnh và manifest.');
  let cursor=offset;
  for(let i=0;i<count;i++){
    if(cursor+46>bytes.length||u32(cursor)!==0x02014b50)throw Error('ZIP bị lỗi mục lục.');
    const method=u16(cursor+10),compressed=u32(cursor+20),original=u32(cursor+24);
    const nameLen=u16(cursor+28),extraLen=u16(cursor+30),commentLen=u16(cursor+32),at=u32(cursor+42);
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLen));
    if(method!==0||compressed!==original||original>2000000||at+30>bytes.length)
      throw Error('ZIP phải là gói Sea-Import WebP nguyên bản (không nén lại).');
    if(u32(at)!==0x04034b50)throw Error('ZIP thiếu dữ liệu Artwork '+name);
    const dataAt=at+30+u16(at+26)+u16(at+28);
    if(dataAt+compressed>bytes.length||entries.has(name)||name.includes('..')||name.startsWith('/'))
      throw Error('Đường dẫn ảnh trong ZIP không hợp lệ.');
    entries.set(name,bytes.slice(dataAt,dataAt+compressed));
    cursor+=46+nameLen+extraLen+commentLen;
  }
  const manifestRaw=entries.get('manifest.json');
  if(!manifestRaw)throw Error('Thiếu manifest.json.');
  const manifest=JSON.parse(decoder.decode(manifestRaw));
  if(manifest.themeId!=='theme-sea'||manifest.imageCount!==44||!Array.isArray(manifest.items)||manifest.items.length!==44
    ||!String(manifest.sourceFolder||'').endsWith('Artifact-44-Moi-RedBlue-KhongBangTen'))
    throw Error('Không đúng bộ 44 Artifact RedBlue chủ đề Biển.');
  const used=new Set();
  for(const item of manifest.items){
    const path='artworks/'+String(item.webp||'');
    if(!/\.webp$/i.test(item.webp||'')||used.has(path)||!entries.has(path)||!/^([a-f0-9]{64})$/.test(item.sha256||''))
      throw Error('Thiếu hoặc trùng ảnh trong ZIP: '+path);
    used.add(path);
  }
  if(used.size!==44||[...entries.keys()].filter(x=>x.startsWith('artworks/')).length!==44)
    throw Error('ZIP phải có đúng 44 ảnh Artifact.');
  return {manifest,entries};
}
async function verifyZipImage(data,hash){
  if(data.length<2000||data[0]!==82||data[1]!==73||data[2]!==70||data[3]!==70
    ||String.fromCharCode(...data.subarray(8,12))!=='WEBP')throw Error('Ảnh WebP bị hỏng.');
  const sha=await crypto.subtle.digest('SHA-256',data);
  const actual=[...new Uint8Array(sha)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==hash)throw Error('Ảnh đã bị thay đổi hoặc hỏng (SHA-256 không khớp).');
}
function chooseZip(){return new Promise(resolve=>{
  const inp=document.createElement('input');inp.type='file';inp.accept='.zip,application/zip';inp.hidden=true;
  document.body.appendChild(inp);
  const cleanup=()=>setTimeout(()=>inp.remove(),200);
  inp.onchange=()=>{resolve(inp.files?.[0]||null);cleanup()};
  inp.click();
})}
async function openSeaImporter(){
  if(typeof isLivePlayRoom==='function'&&isLivePlayRoom()){alert('Vui lòng kết thúc hoặc rời phòng đang chơi trước khi thay artwork Artifact.');return}
  const cards=Array.isArray(state.artifacts)?state.artifacts.filter(a=>a?.id):[];
  if(cards.length<44){alert('Kho Artifact của GM chỉ có '+cards.length+' lá. Cần đủ 44 lá đã lưu trước khi nạp để tránh gắn sai.');return}
  const file=await chooseZip();if(!file)return;
  let zip;
  try{zip=readStoredZip(await file.arrayBuffer())}catch(error){alert('Không đọc được bộ Artifact: '+errorMessage(error));return}
  const overlay=document.createElement('div');overlay.className='gmww-sea-import-overlay';overlay.id=SEA_IMPORT_ID;
  const shell=document.createElement('section');shell.className='gmww-sea-import-dialog';
  shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Nạp 44 ảnh Artifact vào chủ đề Biển');
  const heading=document.createElement('header');heading.className='gmww-sea-import-header';
  heading.innerHTML='<div><b>🌊 NẠP 44 ARTWORK · CHỦ ĐỀ BIỂN</b><small>Ảnh không bảng tên · Tên và chức năng lá bài vẫn lấy từ GMWW</small></div>';
  const close=document.createElement('button');close.type='button';close.textContent='✕';close.title='Đóng';heading.appendChild(close);shell.appendChild(heading);
  const notice=document.createElement('p');notice.className='gmww-sea-import-notice';
  notice.textContent='Kiểm tra cặp Ảnh ↔ Lá Artifact trước khi nạp. Đây là 44 đề xuất theo hình ảnh, không phải ánh xạ được xác nhận trước đó; bạn có thể đổi ngay trong mỗi ô. Mọi ảnh và luật hiện có được giữ nguyên cho đến khi xác nhận nạp.';
  shell.appendChild(notice);
  const grid=document.createElement('div');grid.className='gmww-sea-import-grid';shell.appendChild(grid);
  const options='<option value="">— Chọn đúng lá Artifact —</option>'+cards.map(a=>'<option value="'+safeHtml(a.id)+'">'+safeHtml(a.name)+'</option>').join('');
  const selects=[],urls=[];
  for(const [i,item] of zip.manifest.items.entries()){
    const data=zip.entries.get('artworks/'+item.webp);
    const url=URL.createObjectURL(new Blob([data],{type:'image/webp'}));urls.push(url);
    const row=document.createElement('label');row.className='gmww-sea-import-card';
    const img=document.createElement('img');img.src=url;img.alt=item.webp;img.loading='lazy';
    const detail=document.createElement('span');detail.className='gmww-sea-import-card-detail';
    const small=document.createElement('small');small.textContent=(i+1)+'/44 · '+item.webp.replace(/\.webp$/i,'').replace(/_/g,' ');
    const select=document.createElement('select');select.innerHTML=options;
    const suggestion=cards.find(a=>fold(a.name)===fold(item.suggestedArtifactName));
    select.value=suggestion?.id||'';
    select.setAttribute('aria-label','Lá Artifact của ảnh '+(i+1));
    detail.appendChild(small);detail.appendChild(select);row.appendChild(img);row.appendChild(detail);grid.appendChild(row);selects.push(select);
  }
  const footer=document.createElement('footer');footer.className='gmww-sea-import-footer';
  const progress=document.createElement('span');progress.textContent='Chưa thay đổi dữ liệu';progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Huỷ';
  const submit=document.createElement('button');submit.type='button';submit.className='gmww-sea-import-confirm';submit.textContent='NẠP 44 ẢNH VÀ ĐỒNG BỘ SERVER';
  footer.appendChild(progress);footer.appendChild(cancel);footer.appendChild(submit);shell.appendChild(footer);overlay.appendChild(shell);document.body.appendChild(overlay);
  const dismiss=()=>{overlay.remove();urls.forEach(u=>URL.revokeObjectURL(u))};
  close.onclick=cancel.onclick=dismiss;
  submit.onclick=async()=>{
    const selected=selects.map(s=>String(s.value||''));
    if(selected.some(x=>!x)||new Set(selected).size!==44){
      progress.textContent='Phải chọn 44 lá khác nhau, không để trống hoặc trùng.';
      progress.classList.add('gmww-sea-import-error');return;
    }
    if(!confirm('Xác nhận thay 44 ảnh của chủ đề Biển bằng cặp ảnh/lá đã chọn? Không sửa tên, chức năng, và không đóng gói lại Ván Mẫu.'))return;
    submit.disabled=cancel.disabled=close.disabled=true;
    const previousTheme=state.themes.activeId||'theme-sea';
    const backups=[];
    let completed=0;
    try{
      // Verify every source hash before writing a single database record.
      progress.textContent='Đang xác minh đủ 44 ảnh…';
      for(const item of zip.manifest.items)
        await verifyZipImage(zip.entries.get('artworks/'+item.webp),item.sha256);
      for(let i=0;i<44;i++){
        const id=selected[i],item=zip.manifest.items[i],bytes=zip.entries.get('artworks/'+item.webp);
        const blob=new Blob([bytes],{type:'image/webp'}),dk=cardBlobKey('theme-sea','artifacts',id,'display');
        const tk=cardBlobKey('theme-sea','artifacts',id,'thumb');
        const oldDisplay=await dbGet(dk),oldThumb=await dbGet(tk);
        backups.push({dk,tk,oldDisplay,oldThumb});
        await dbPut(dk,blob);
        await dbPut(tk,await thumbBlobFromFile(blob));
        for(const key of [dk,tk]){
          const old=objectUrls.get(key);if(old)try{URL.revokeObjectURL(old)}catch(_){}
          objectUrls.delete(key);
        }
        completed=i+1;progress.textContent='Đã lưu '+completed+'/44 ảnh vào Chủ Đề Biển…';
      }
    }catch(error){
      progress.textContent='Đang khôi phục ảnh cũ sau lỗi: '+errorMessage(error);
      for(const b of backups.reverse()){
        for(const [key,record] of [[b.dk,b.oldDisplay],[b.tk,b.oldThumb]]){
          try{if(record?.blob)await dbPut(key,record.blob);else await dbDelete(key);objectUrls.delete(key)}catch(_){}
        }
      }
      progress.textContent='Chưa đồng bộ Server. Đã thử khôi phục ảnh cũ: '+errorMessage(error);
      progress.classList.add('gmww-sea-import-error');submit.disabled=cancel.disabled=close.disabled=false;return;
    }
    // One explicit, one-time upload to the global Artifact catalog. Per-game packaging
    // remains Role-only; old match images keep their immutable signature snapshots.
    state.themes.activeId='theme-sea';
    state.themes.selectedEditorId='theme-sea';
    saveState();
    progress.textContent='Đã lưu 44/44. Đang đồng bộ 44 ảnh vào kho Artifact dùng chung trên Server…';
    let report;
    try{
      report=await playSyncSharedArtifactLibrary({onlyIds:selected,forceIds:selected});
    }catch(error){report={ok:false,synced:0,failed:[{id:'server',error:errorMessage(error)}]}}
    if(report.ok!==true){
      progress.textContent='Ảnh chủ đề Biển đã lưu trên GM. Server nạp '+report.synced+'/44; lỗi: '+(report.failed||[]).map(x=>x.id+': '+x.error).slice(0,2).join(' | ')+'. Nhấn NẠP lại ZIP để tiếp tục.';
      progress.classList.add('gmww-sea-import-error');cancel.disabled=close.disabled=false;return;
    }
    try{
      const remote=await gmApi('/api/gm/artifacts/shared',{timeoutMs:20000});
      const known=new Map((remote.artifacts||[]).map(x=>[String(x.assetId),String(x.signature)]));
      for(const id of selected){
        const artifact=cards.find(a=>String(a.id)===id);
        const sig=await playSharedArtifactSignature(artifact);
        if(known.get('artifact:'+id)!==sig)throw Error('Chưa xác minh được '+artifact.name);
      }
      progress.textContent='THÀNH CÔNG: 44/44 ảnh đã lưu và Server xác nhận đúng chữ ký; Player Web dùng kho Artifact này.';
      progress.classList.remove('gmww-sea-import-error');progress.classList.add('gmww-sea-import-success');
      submit.textContent='ĐÃ NẠP VÀ XÁC MINH 44/44';cancel.disabled=close.disabled=false;
      if(typeof renderTheme==='function')void renderTheme();
      if(typeof renderEntityGrid==='function')void renderEntityGrid('artifacts');
    }catch(error){
      progress.textContent='Ảnh đã gửi lên Server nhưng chưa xác minh đủ: '+errorMessage(error);
      progress.classList.add('gmww-sea-import-error');cancel.disabled=close.disabled=false;
    }
  };
}
function mount(){
  const anchor=$('themeArtifactRows');if(!anchor||$(SEA_IMPORT_ID+'Button'))return;
  const bar=document.createElement('div');bar.className='gmww-sea-import-toolbar';
  const btn=document.createElement('button');btn.id=SEA_IMPORT_ID+'Button';btn.type='button';
  btn.textContent='↥ NẠP BỘ 44 ARTWORK REDBLUE · KHÔNG BẢNG TÊN';
  const tip=document.createElement('small');tip.textContent='Chủ đề Biển · ZIP 44 WebP · đồng bộ một lần vào kho Artifact dùng chung';
  bar.appendChild(btn);bar.appendChild(tip);anchor.parentNode.insertBefore(bar,anchor);
  btn.onclick=()=>void openSeaImporter().catch(error=>alert('Không nạp được Artifact: '+errorMessage(error)));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
