// Stage NINE owner-approved front-view avatar images, independently verified from the
// original Cloudflare costume-review page. Do not claim 8-view skins or animation.
import fs from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import roster from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
const sha=buf=>createHash('sha256').update(buf).digest('hex');
const url=roster.sourceUrl;
const source=await fetch(url,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(45000)});
if(!source.ok)throw Error('OWNER_APPROVED_COSTUME_SOURCE_HTTP_'+source.status);
const html=await source.text();
const sourceSHA=sha(Buffer.from(html));
if(sourceSHA!==roster.sourcePageSHA256)throw Error('APPROVED_PAGE_HASH_MISMATCH: '+sourceSHA);
// Only exact inline images labeled with their original character ID can be accepted.
// Never crop an adjacent artwork or use the V6.05 Character21 skin as a surrogate.
const offset=html.indexOf('const items=');
if(offset<0)throw Error('SOURCE_MISSING_ITEMS_ARRAY');
const end=html.indexOf(']',offset+'const items='.length);
if(end<0)throw Error('SOURCE_ITEMS_NOT_TERMINATED');
const items=JSON.parse(html.slice(offset+'const items='.length,end+1));
if(!Array.isArray(items)||items.length!==30)throw Error('EXPECTED_30_APPROVED_ITEMS');
const extracted=items.filter(x=>/^character-(2[2-9]|30)$/.test(x.id)&&x.kind==='Cơ bắp'&&String(x.src).startsWith('data:image/webp;base64,'));
const map=new Map(extracted.map(x=>[x.id,Buffer.from(x.src.split(',')[1],'base64')]));
if(map.size!==9)throw Error('EXPECTED_9_APPROVED_COSTUME_IMAGES_GOT_'+map.size);
const targets=roster.characters;
if(targets.length!==9||targets.some((r,i)=>r.id!=='character-'+(22+i)||r.availableGLB!==false||r.validArtworkViews!==1))throw Error('ROSTER_CONTRACT_FAILURE');
for(const row of targets){
 const buf=map.get(row.id);
 if(!buf)throw Error('MISSING_ARTWORK_'+row.id);
 if(buf.length!==row.bytes||sha(buf)!==row.sha256)throw Error('ARTWORK_HASH_MISMATCH_'+row.id);
 if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WEBP')throw Error('NOT_A_WEBP_'+row.id);
 const dest=resolve('assets',row.avatar.replace(/^\//,''));
 await fs.mkdir(dirname(dest),{recursive:true});
 await fs.writeFile(dest,buf);
}
console.log(JSON.stringify({ok:true,sourcePageSHA256:sourceSHA,avatars:targets.map(r=>({id:r.id,sha256:r.sha256,bytes:r.bytes})),animationEnabled:false,mainProductionChanged:false},null,2));
