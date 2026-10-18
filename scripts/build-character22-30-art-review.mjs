// GMWW V6.06 isolated staging gallery — nine actual approved frontal assets.
// Do not introduce GLB/8-view/four-action claims until individually accepted.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import roster from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
import costumes from '../assets/characters/overhaul-v600/approved-costumes-21-30.json' with {type:'json'};
const source='https://gmww-character-v600-review.williampham0702.workers.dev/';
const arr=roster.characters;
if(arr.length!==9||arr.some((x,i)=>x.id!=='character-'+(i+22)||x.availableGLB!==false||x.availableActions.length!==0||x.validArtworkViews!==1))throw Error('UNAPPROVED_ARTWORK_ROSTER');
const approved=new Set(costumes.assets.filter(x=>x.approval==='costume appearance only').map(x=>x.id));
if(arr.some(x=>!approved.has(x.id)))throw Error('COSTUME_NOT_APPROVED');
const sha=buf=>createHash('sha256').update(buf).digest('hex');
for(const x of arr){
 const p=resolve('assets',x.avatar.replace(/^\//,''));
 const buf=await readFile(p);
 if(buf.length!==x.bytes||sha(buf)!==x.sha256)throw Error('UNVERIFIED_COSTUME_'+x.id);
}
const css='*{box-sizing:border-box}body{margin:0;background:linear-gradient(155deg,#071b2e,#12435b);color:#e6faff;font:14px/1.5 system-ui,-apple-system,sans-serif}main{max-width:1100px;padding:14px;margin:auto}header{padding:18px 15px;background:#082637;border-bottom:1px solid #397d97}h1{font-size:22px;margin:0}small{color:#a9d1df}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#9ef3f1}.notice{padding:12px;background:#473720;color:#ffebc2;border:1px solid #a2864a;border-radius:12px;margin:12px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(156px,1fr));gap:12px}.item{padding:10px;background:#114159;border:1px solid #4387a2;border-radius:14px;display:grid;gap:7px}.item img{object-fit:contain;width:100%;height:210px;background:#072738;border-radius:9px}.item b{font-size:14px}.item small{font-size:11px}.status{color:#aaf0dc}.open{font-size:11px;text-decoration:underline}.footer{font-size:12px;margin-top:20px;color:#abd0db}@media(max-width:430px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.item img{height:175px}}';
const cards=arr.map(x=>'<article class="item" data-character="'+x.id+'"><img src="'+x.avatar+'" alt="Artwork trang phục '+x.id+'" loading="lazy"><b>'+x.id+'</b><span class="status">✓ Trang phục chibi cơ bắp đã duyệt</span><small>1 góc chính diện • Chưa có skin GLB 8 hướng / 4 chuyển động</small><a class="open" href="'+x.avatar+'" target="_blank" rel="noopener">Xem ảnh đầy đủ</a></article>').join('');
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>GMWW V6.06 • Nhân vật 22–30</title><style>'+css+'</style></head><body><header><h1>GMWW — Character 22–30</h1><small>Trang phục đã duyệt • Skin 8 hướng và chuyển động chưa nghiệm thu</small></header><main><nav><a href="/character-v605-gm/GMWW.html?characterV605=1">GM Game Staging</a><a href="/?characterV605=1">Player Web Game Staging</a><a href="'+source+'" target="_blank" rel="noopener">Ảnh mẫu gốc đã duyệt</a></nav><section class="notice">Chỉ duyệt artwork: 9 avatar chính diện được đối chiếu SHA-256 với nguồn đã duyệt. Character 22–30 CHƯA được bật GLB hoặc 4 chuyển động trong phòng. Character 21 V6.05 vẫn là mẫu duyệt chuyển động.</section><section class="grid">'+cards+'</section><p class="footer">STAGING CÔ LẬP · Không cập nhật main, Production, IPA hoặc dữ liệu thật</p></main></body></html>';
const dir=resolve('assets/character-v605-review');await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),html,'utf8');
console.log(JSON.stringify({ok:true,page:'/character-v605-review/index.html',count:arr.length,sha256Verified:true,mainProductionChanged:false},null,2));
