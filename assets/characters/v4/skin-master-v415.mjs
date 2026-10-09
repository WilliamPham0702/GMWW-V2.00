// V4.15: lossless PNG export from V4.14 approved skeleton-bound VECTOR preview.
// Resolution is high (1200x1920), but this is NOT a claim of hand-painted final art.
import {skeletonPose} from './skeleton-rig.mjs';
import {drawV414Skin,drawV414SkinLayer,V414_CHARACTERS,V414_DIRECTIONS,V414_LAYERS} from './skin-v414.mjs';
export const MASTER_SIZE=Object.freeze({width:1200,height:1920});
export const MASTER_VERSION='4.15-vector-raster-master';
const encoder=new TextEncoder();
const safe=(id,direction)=>{
 if(!V414_CHARACTERS.includes(id))throw Error('UNSUPPORTED_CHARACTER');
 if(!V414_DIRECTIONS.includes(direction))throw Error('UNSUPPORTED_DIRECTION');
};
export function masterPose(id,direction){
 safe(id,direction);
 return skeletonPose({action:'idle',direction,elapsedMs:0,progress:0});
}
export function paintMaster(ctx,id,direction,{width=MASTER_SIZE.width,height=MASTER_SIZE.height,layerName=null}={}){
 const pose=masterPose(id,direction);
 if(layerName)return drawV414SkinLayer(ctx,pose,{characterId:id,layerName,width,height});
 return drawV414Skin(ctx,pose,{characterId:id,width,height});
}
export function createMasterCanvas(id,direction,{layerName=null,width=MASTER_SIZE.width,height=MASTER_SIZE.height}={}){
 if(typeof document==='undefined')throw Error('BROWSER_CANVAS_REQUIRED');
 const c=document.createElement('canvas');
 c.width=width;c.height=height;
 const ctx=c.getContext('2d');
 if(!ctx)throw Error('CANVAS_CONTEXT_UNAVAILABLE');
 paintMaster(ctx,id,direction,{width,height,layerName});
 return c;
}
export function canvasToPng(canvas){
 return new Promise((resolve,reject)=>{
  if(typeof canvas.toBlob!=='function')return reject(Error('PNG_EXPORT_UNAVAILABLE'));
  canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG_ENCODING_FAILED')),'image/png');
 });
}
export async function masterFile(id,direction,{layerName=null}={}){
 const canvas=createMasterCanvas(id,direction,{layerName});
 const blob=await canvasToPng(canvas);
 const suffix=layerName?'/layers/'+layerName:'';
 const name='character-v415/'+id+'/'+direction+suffix+'.png';
 return {name,bytes:new Uint8Array(await blob.arrayBuffer())};
}
const crcTable=Array.from({length:256},(_,i)=>{
 let v=i;for(let j=0;j<8;j++)v=v&1?0xedb88320^(v>>>1):v>>>1;
 return v>>>0;
});
export function crc32(bytes){
 let crc=0xffffffff;
 for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function hdr(size){const b=new Uint8Array(size);return {b,d:new DataView(b.buffer)};}
const u16=(d,i,v)=>d.setUint16(i,v,true);
const u32=(d,i,v)=>d.setUint32(i,v>>>0,true);
export function storeZip(entries){
 if(!Array.isArray(entries)||entries.length>65535)throw Error('INVALID_ARCHIVE');
 let offset=0;const body=[],central=[];let centralBytes=0;
 for(const entry of entries){
  if(!entry||typeof entry.name!=='string'||entry.name.includes('..')||entry.name.startsWith('/')||!(entry.bytes instanceof Uint8Array))
   throw Error('INVALID_ZIP_ENTRY');
  const name=encoder.encode(entry.name),bytes=entry.bytes,size=bytes.byteLength,crc=crc32(bytes);
  if(name.length>65535||size>0xffffffff)throw Error('FILE_TOO_LARGE');
  const local=hdr(30+name.length);
  u32(local.d,0,0x04034b50);u16(local.d,4,20);u16(local.d,6,0);u16(local.d,8,0);
  u32(local.d,14,crc);u32(local.d,18,size);u32(local.d,22,size);u16(local.d,26,name.length);
  local.b.set(name,30);body.push(local.b,bytes);
  const cd=hdr(46+name.length);
  u32(cd.d,0,0x02014b50);u16(cd.d,4,20);u16(cd.d,6,20);
  u32(cd.d,16,crc);u32(cd.d,20,size);u32(cd.d,24,size);u16(cd.d,28,name.length);
  u32(cd.d,42,offset);cd.b.set(name,46);central.push(cd.b);
  centralBytes+=cd.b.length;offset+=local.b.length+size;
 }
 const end=hdr(22);
 u32(end.d,0,0x06054b50);u16(end.d,8,entries.length);u16(end.d,10,entries.length);
 u32(end.d,12,centralBytes);u32(end.d,16,offset);
 return new Blob([...body,...central,end.b],{type:'application/zip'});
}
export function downloadBlob(blob,name){
 if(typeof document==='undefined')throw Error('BROWSER_REQUIRED');
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
export async function export8MasterPNGs(onProgress=()=>{}){
 const entries=[];let count=0;
 for(const id of V414_CHARACTERS)for(const direction of V414_DIRECTIONS){
  entries.push(await masterFile(id,direction));onProgress(++count,8);
 }
 const archive=storeZip(entries);
 downloadBlob(archive,'GMWW-Character-V4.15-8-master-1200x1920.zip');
 return {files:entries.length,sizeBytes:archive.size};
}
export async function export17Layers(id,direction,onProgress=()=>{}){
 safe(id,direction);
 const entries=[];
 for(const layerName of V414_LAYERS){
  entries.push(await masterFile(id,direction,{layerName}));
  onProgress(entries.length,V414_LAYERS.length);
 }
 const archive=storeZip(entries);
 downloadBlob(archive,'GMWW-V4.15-'+id+'-'+direction+'-17-layers.zip');
 return {files:entries.length,sizeBytes:archive.size};
}
