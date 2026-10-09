// GMWW Character V4.16 premium-art staging / asset QA.
 // Local only: files and pixels remain in the user's browser. Nothing is
 // auto-published into main game, Player Web room, IPA or persistent storage.
import {V414_CHARACTERS,V414_DIRECTIONS,V414_LAYERS} from './skin-v414.mjs';
import {storeZip,downloadBlob,canvasToPng} from './skin-master-v415.mjs';

export const ARTWORK_QA_VERSION='4.16-premium-art-staging';
export const MIN_MASTER=Object.freeze({width:1024,height:1536});
export const REQUIRED_CHARACTERS=Object.freeze([...V414_CHARACTERS]);
export const REQUIRED_DIRECTIONS=Object.freeze([...V414_DIRECTIONS]);
export const REQUIRED_LAYERS=Object.freeze([...V414_LAYERS]);

export function parseFilename(filename){
 const n=String(filename||'').split(/[\\/]/).pop().toLowerCase().replace(/\.(png|webp)$/,'');
 const m=n.match(/^(character-0[12])[-_](front|left|right|back)(?:[-_](.+))?$/);
 if(!m)return null;
 const layer=m[3]||null;
 if(layer&&!REQUIRED_LAYERS.includes(layer))return null;
 return {id:m[1],direction:m[2],layer,key:[m[1],m[2],layer||'master'].join('/')};
}
export function requiredKeys(){
 const keys=[];
 for(const id of REQUIRED_CHARACTERS)for(const dir of REQUIRED_DIRECTIONS){
  keys.push([id,dir,'master'].join('/'));
  for(const layer of REQUIRED_LAYERS)keys.push([id,dir,layer].join('/'));
 }
 return keys;
}
export function validateImageMeta({type,width,height,hasTransparency,layer=null}){
 if(!['image/png','image/webp'].includes(String(type)))return {ok:false,reason:'Chỉ nhận PNG/WebP'};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)return {ok:false,reason:'Kích thước không hợp lệ'};
 if(width<MIN_MASTER.width||height<MIN_MASTER.height)return {ok:false,reason:'Ảnh nhỏ hơn 1024×1536 px'};
 if(width>8192||height>8192)return {ok:false,reason:'Ảnh vượt giới hạn 8192 px'};
 if(layer&&!REQUIRED_LAYERS.includes(layer))return {ok:false,reason:'Tên lớp Skin không hợp lệ'};
 if(!hasTransparency)return {ok:false,reason:'Chưa có nền trong suốt'};
 return {ok:true,reason:'Hợp lệ'};
}
export function checkCoverage(entries){
 const keys=new Set([...entries].map(x=>typeof x==='string'?x:x.key));
 const missing=requiredKeys().filter(key=>!keys.has(key));
 const missingMasters=missing.filter(x=>x.endsWith('/master'));
 const missingLayers=missing.filter(x=>!x.endsWith('/master'));
 return Object.freeze({
  mastersReady:8-missingMasters.length,totalMaster:8,
  layersReady:136-missingLayers.length,totalLayers:136,
  complete:missing.length===0,missingMasters,missingLayers,
  ownerApproved:false,productionSkinEnabled:false
 });
}
function colorsClose(data,i,bg,tolerance){
 const r=data[i]-bg[0],g=data[i+1]-bg[1],b=data[i+2]-bg[2];
 return r*r+g*g+b*b<=tolerance*tolerance;
}
/** Remove only edge-connected pixels matching the four corner background samples.
 * Better than deleting every matching color (which would erase turquoise clothes).
 * Boundary mask is kept inside the browser for human visual review.
 */
export function knockOutConnectedBackground(pixels,width,height,{tolerance=38}={}){
 if(!(pixels instanceof Uint8ClampedArray)||pixels.length!==width*height*4)throw Error('INVALID_PIXELS');
 if(width<2||height<2||width*height>40000000)throw Error('INVALID_MASK_SIZE');
 if(!Number.isFinite(tolerance)||tolerance<0||tolerance>180)throw Error('INVALID_TOLERANCE');
 const seeds=[0,width-1,(height-1)*width,height*width-1],references=seeds.map(k=>[
  pixels[k*4],pixels[k*4+1],pixels[k*4+2]
 ]);
 // Do not merge far-apart corner tones; flood separately per detected color.
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
 let end=0,front=0;
 const accept=(id)=>{
  if(seen[id])return;
  const p=id*4;
  if(pixels[p+3]===0){seen[id]=1;queue[end++]=id;return;}
  let match=false;
  for(const sample of references){if(colorsClose(pixels,p,sample,tolerance)){match=true;break;}}
  if(match){seen[id]=1;queue[end++]=id;}
 };
 // All border pixels can seed a background, but only if they match corners.
 for(let x=0;x<width;x++){accept(x);accept((height-1)*width+x);}
 for(let y=0;y<height;y++){accept(y*width);accept(y*width+width-1);}
 while(front<end){
  const k=queue[front++],x=k%width,y=(k/width)|0;
  if(x>0)accept(k-1);if(x+1<width)accept(k+1);
  if(y>0)accept(k-width);if(y+1<height)accept(k+width);
 }
 const output=new Uint8ClampedArray(pixels), removed=end;
 for(let k=0;k<seen.length;k++){
  if(seen[k]){output[k*4]=0;output[k*4+1]=0;output[k*4+2]=0;output[k*4+3]=0;}
 }
 return {pixels:output,removed,total:width*height};
}
export async function decodeArtwork(file){
 if(!file||!['image/png','image/webp'].includes(file.type))throw Error('Chỉ nhận ảnh PNG hoặc WebP');
 if(file.size>25*1024*1024)throw Error('Tệp quá 25 MB');
 const bitmap=typeof createImageBitmap==='function'?await createImageBitmap(file):null;
 if(!bitmap)throw Error('Trình duyệt không hỗ trợ đọc ảnh');
 if(bitmap.width>8192||bitmap.height>8192){bitmap.close();throw Error('Ảnh quá 8192 px');}
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(bitmap,0,0);bitmap.close();
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 const alpha=image.data;let hasTransparency=false;
 // Alpha scan with bounded sampling; exact scan follows when applying matte.
 for(let i=3;i<alpha.length;i+=4){if(alpha[i]<250){hasTransparency=true;break;}}
 return {canvas,ctx,image,hasTransparency};
}
export async function normalizeArtworkFile(file,{matte=false,tolerance=38}={}){
 const parsed=parseFilename(file.name);
 if(!parsed)throw Error('Tên tệp phải là character-01_front.png hoặc character-01_front_hair_back.png (tương tự với Character 02)');
 const decoded=await decodeArtwork(file);
 const {canvas,ctx,image}=decoded;
 if(matte&&!decoded.hasTransparency){
  const result=knockOutConnectedBackground(image.data,canvas.width,canvas.height,{tolerance});
  image.data.set(result.pixels);ctx.putImageData(image,0,0);decoded.hasTransparency=result.removed>0;
 }
 const meta=validateImageMeta({type:file.type,width:canvas.width,height:canvas.height,
  hasTransparency:decoded.hasTransparency,layer:parsed.layer});
 if(!meta.ok)throw Error(meta.reason+': '+file.name);
 const blob=await canvasToPng(canvas);
 return {...parsed,width:canvas.width,height:canvas.height,blob,
  sizeBytes:blob.size,objectUrl:URL.createObjectURL(blob)};
}
export async function exportValidatedAssets(entries,onProgress=()=>{}){
 const coverage=checkCoverage(entries);
 if(!coverage.complete)throw Error('Chưa đủ 8 master và 136 lớp trong suốt để xuất bộ hoàn chỉnh');
 const files=[];
 for(const item of entries){
  if(!item||!item.blob||!item.key)throw Error('ASSET_MISSING_BYTES');
  const fileName='gmww-v416/'+item.key+'.png';
  files.push({name:fileName,bytes:new Uint8Array(await item.blob.arrayBuffer())});
  onProgress(files.length,144);
 }
 const archive=storeZip(files);
 downloadBlob(archive,'GMWW-Character-V4.16-reviewed-assets.zip');
 return {files:files.length,bytes:archive.size};
}
