// HTTP audit of nine owner-approved muscular chibi costume avatars, isolated staging only.
import {createHash} from 'node:crypto';
import roster from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
const base='https://gmww-character21-v605-game-staging.williampham0702.workers.dev';
for(const row of roster.characters){
 const r=await fetch(base+row.avatar,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(row.id+'_HTTP_'+r.status);
 const b=Buffer.from(await r.arrayBuffer()),sha=createHash('sha256').update(b).digest('hex');
 if(b.length!==row.bytes||sha!==row.sha256)throw Error(row.id+'_SHA256_FAILED');
 console.log(row.id+' '+b.length+' SHA-256 OK');
}
console.log('NINE FRONT ARTWORKS VERIFIED; no 8-view skins are approved yet.');
