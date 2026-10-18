// Vendor only the nine owner-approved V6.00 front-facing costume portraits.
// These are NOT rigged 3D characters; no placeholder GLB or animation substitution permitted.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import manifest from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};

const SOURCE=manifest.sourceUrl;
const PAGE_SHA=manifest.sourcePageSHA256;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
const getPage=async()=>{
 const r=await fetch(SOURCE,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('APPROVED_SOURCE_HTTP_'+r.status);
 const buffer=Buffer.from(await r.arrayBuffer());
 if(sha256(buffer)!==PAGE_SHA)throw new Error('APPROVED_SOURCE_PAGE_SHA256_CHANGED');
 return buffer.toString('utf8');
};
export function extractPortraits(page){
 const anchor='const items=';
 const start=page.indexOf(anchor);
 if(start<0)throw new Error('APPROVED_PAGE_ITEMS_MISSING');
 const end=page.indexOf('];',start+anchor.length);
 if(end<start)throw new Error('APPROVED_PAGE_ITEMS_INVALID');
 const items=JSON.parse(page.slice(start+anchor.length,end+1));
 if(!Array.isArray(items)||items.length!==30)throw new Error('EXPECTED_THIRTY_APPROVED_ART_ITEMS');
 const byId=new Map(items.map(item=>[item.id,item]));
 const seen=new Set(),all=new Map();
 for(const item of manifest.characters){
   if(!/^character-(2[2-9]|30)$/.test(item.id)||item.availableGLB!==false||item.status!=='PORTRAIT_ONLY_NOT_RIGGED')throw new Error('UNAPPROVED_ASSET_ROW');
   const v=byId.get(item.id);
   if(!v||v.kind!=='Cơ bắp'||typeof v.src!=='string'||!v.src.startsWith('data:image/webp;base64,'))throw new Error('MISSING_APPROVED_COSTUME_'+item.id);
   const blob=Buffer.from(v.src.split(',')[1],'base64');
   if(sha256(blob)!==item.sha256||blob.length!==item.bytes)throw new Error('PORTRAIT_SHA256_FAILED_'+item.id);
   if(blob.toString('ascii',0,4)!=='RIFF'||blob.toString('ascii',8,12)!=='WEBP')throw new Error('INVALID_PORTRAIT_WEBP');
   if(seen.has(item.sha256))throw new Error('DUPLICATE_PORTRAIT');
   seen.add(item.sha256);all.set(item.id,blob);
 }
 if(all.size!==9)throw new Error('NOT_ALL_NINE_PORTRAITS_PRESENT');
 return all;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 try{
  const items=extractPortraits(await getPage());
  for(const [id,blob] of items){
   const dir=path.join(root,'assets/characters/overhaul-v600',id);
   await fs.mkdir(dir,{recursive:true});
   await fs.writeFile(path.join(dir,'avatar.webp'),blob);
  }
  console.log(JSON.stringify({readyForMain:false,portraitOnly:true,characters:[...items.keys()],bytes:[...items.values()].map(x=>x.length),sourceSha256:PAGE_SHA,productionChanged:false},null,2));
 }catch(error){console.error(error);process.exitCode=1}
}
