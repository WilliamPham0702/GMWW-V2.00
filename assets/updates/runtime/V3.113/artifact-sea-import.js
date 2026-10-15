/* GMWW: safe batch importer for 44 artwork-only Sea Artifacts.
   ZIP_STORED with artworks/*.webp + manifest.json (SHA-256).
   Card metadata, role assignments and old game snapshots remain untouched. */
(() => {
  'use strict';
  const total=44, limit=25*1024*1024, td=new TextDecoder();
  const el=id=>document.getElementById(id);
  const notice=msg=>{if(el('seaArtifactImportStatus'))el('seaArtifactImportStatus').textContent=msg};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let rows=null,urls=[];
  function readStoredZip(ab){
    const v=new DataView(ab),out=new Map();let p=0;
    while(p+4<=ab.byteLength&&v.getUint32(p,true)===0x04034b50){
      if(p+30>ab.byteLength)throw Error('ZIP không hợp lệ');
      const flags=v.getUint16(p+6,true),method=v.getUint16(p+8,true),
        compressed=v.getUint32(p+18,true),size=v.getUint32(p+22,true),
        n=v.getUint16(p+26,true),extra=v.getUint16(p+28,true);
      if((flags&9)||method!==0||size!==compressed||size>limit)throw Error('Cần ZIP chuẩn Stored, không mã hóa.');
      const start=p+30+n+extra,end=start+size;
      if(end>ab.byteLength)throw Error('ZIP bị thiếu dữ liệu');
      const name=td.decode(new Uint8Array(ab,p+30,n));
      if(out.has(name)||name.includes('..')||name.startsWith('/'))throw Error('Đường dẫn ảnh không hợp lệ');
      out.set(name,new Uint8Array(ab.slice(start,end)));p=end;
    }
    return out;
  }
  async function sha256(b){
    const d=await crypto.subtle.digest('SHA-256',b);
    return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function parse(file){
    if(!file||file.size>limit||!file.name.toLowerCase().endsWith('.zip'))throw Error('Chọn ZIP 44 lá đã tối ưu, tối đa 25 MB');
    const files=readStoredZip(await file.arrayBuffer()),raw=files.get('manifest.json');
    if(!raw)throw Error('Thiếu manifest.json');
    const m=JSON.parse(td.decode(raw));
    if(m.themeId!=='theme-sea'||m.imageCount!==total||!Array.isArray(m.items)||m.items.length!==total)throw Error('Không phải bộ 44 Artifact chủ đề Biển');
    const used=new Set(), result=[];
    for(const item of m.items){
      const key='artworks/'+String(item.webp||'');
      if(used.has(key)||!key.endsWith('.webp'))throw Error('Tên ảnh không hợp lệ / trùng');
      used.add(key);
      const b=files.get(key);
      if(!b||b.length<1000||b.length>1300000||await sha256(b)!==item.sha256)throw Error('Lỗi SHA-256: '+item.webp);
      result.push({item,blob:new Blob([b],{type:'image/webp'}),artifactId:''});
    }
    if([...files.keys()].filter(k=>k.startsWith('artworks/')).length!==total)throw Error('Ảnh trong ZIP không đủ 44');
    return result;
  }
  function validation(){
    const ids=(rows||[]).map(x=>x.artifactId);
    return rows&&rows.length===total&&ids.every(Boolean)&&new Set(ids).size===total;
  }
  function preview(){
    const host=el('seaArtifactImportPreview');host.replaceChildren();
    for(const u of urls)URL.revokeObjectURL(u);urls=[];
    const cards=(state.artifacts||[]).filter(a=>a?.id);
    if(cards.length!==total){notice('GM đang có '+cards.length+'/44 Artifact. Hãy đồng bộ danh sách lá trước khi nhập, không tạo lá ảo.');return}
    const chosen=new Set();
    for(const row of rows){
      const candidate=cards.filter(a=>norm(a.name)===norm(row.item.suggestedArtifactName));
      if(candidate.length===1&&!chosen.has(String(candidate[0].id))){
        row.artifactId=String(candidate[0].id);chosen.add(row.artifactId);
      }
      const item=document.createElement('div');item.className='sea-artwork-import-row';
      const img=document.createElement('img');img.alt='Artwork không có bảng tên';img.src=URL.createObjectURL(row.blob);urls.push(img.src);
      const info=document.createElement('div'),caption=document.createElement('small'),hint=document.createElement('small'),select=document.createElement('select');
      caption.textContent=row.item.webp;
      hint.textContent='Gợi ý chưa nghiệm thu: '+String(row.item.suggestedArtifactName||'Chưa có');
      select.setAttribute('aria-label','Chọn lá Artifact ứng với ảnh');
      select.add(new Option('Chọn lá Artifact',''));
      for(const card of cards)select.add(new Option(card.name,String(card.id)));
      select.value=row.artifactId;
      select.onchange=()=>{row.artifactId=select.value;notice(validation()?'Đã ghép đủ 44/44. Kiểm tra hình trước khi nạp.':'Chưa ghép đủ 44 ảnh với 44 Artifact khác nhau.');};
      info.append(caption,select,hint);item.append(img,info);host.append(item);
    }
    notice(validation()?'Đã ghép 44/44 theo gợi ý. KIỂM TRA đối chiếu ảnh với tên lá trước khi nạp.':'Chưa ghép đủ 44 ảnh với 44 Artifact khác nhau.');
  }
  async function perform(){
    if(!validation()){notice('Phải ghép 44 ảnh với 44 lá Artifact khác nhau.');return}
    if(typeof isLivePlayRoom==='function'&&isLivePlayRoom()){notice('Không thể thay artwork khi phòng đang chơi.');return}
    if(!confirm('Nạp 44 ảnh chủ đề Biển sau khi đã kiểm tra ghép đúng lá? Artwork cũ sẽ được sao lưu.'))return;
    const button=el('seaArtifactImportStart');button.disabled=true;
    try{
      state.themes.activeId='theme-sea';saveState();
      let index=0;
      for(const x of rows){
        const id=x.artifactId;
        for(const type of ['display','thumb']){
          const key=cardBlobKey('theme-sea','artifacts',id,type);
          const before=await dbGet(key),backup='sea-artifact-44-backup|'+key;
          if(before?.blob&&!(await dbGet(backup)))await dbPut(backup,before.blob);
          await dbPut(key,type==='display'?x.blob:await thumbBlobFromFile(x.blob));
          const previous=objectUrls.get(key);
          if(previous)URL.revokeObjectURL(previous);
          objectUrls.delete(key);
        }
        notice('Đã cập nhật ảnh trong chủ đề Biển '+(++index)+'/44. Đang chờ đồng bộ server...');
      }
      notice('Đang nạp 44 lá vào kho Artifact dùng chung. Giữ trang mở...');
      const ids=rows.map(x=>x.artifactId);
      const report=await playSyncSharedArtifactLibrary({onlyIds:ids,forceIds:ids});
      if(report.failed?.length){
        notice('Đã lưu ảnh ở GM; server còn lỗi '+report.failed.length+' lá: '+report.failed.map(x=>x.id).join(', ')+'. Có thể thử lại.');
      }else{
        notice('THÀNH CÔNG: 44/44 ảnh đã được máy chủ xác nhận, Player Web dùng kho Artifact mới.');
      }
      await renderTheme();renderEntityGrid('artifacts');
    }catch(e){notice('Có lỗi: '+String(e?.message||e)+'. Ảnh cũ đã được sao lưu.');}
    finally{button.disabled=false}
  }
  const picker=el('seaArtifactImportFile'),start=el('seaArtifactImportStart');
  if(!picker||!start)return;
  picker.onchange=async()=>{
    rows=null;start.disabled=true;el('seaArtifactImportPreview').replaceChildren();
    try{notice('Đang kiểm tra 44 ảnh và SHA-256...');rows=await parse(picker.files?.[0]);preview();start.disabled=false}
    catch(e){notice(String(e?.message||e))}
  };
  start.onclick=perform;
  window.GMWWSeaArtifactImporter=Object.freeze({readStoredZip,parse,validation});
})();