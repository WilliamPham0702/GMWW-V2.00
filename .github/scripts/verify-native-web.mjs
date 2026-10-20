import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.argv[2];
if(!root)throw Error('Expected native Web directory');
const safe=rel=>rel&&!path.isAbsolute(rel)&&!rel.split('/').some(p=>!p||p==='.'||p==='..');
const requireFile=rel=>{if(!safe(rel)||!fs.statSync(path.join(root,rel)).isFile()||!fs.statSync(path.join(root,rel)).size)throw Error('Missing or unsafe native dependency '+rel)};
const html=fs.readFileSync(path.join(root,'GMWW.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
 const ref=m[1].split(/[?#]/)[0];
 if(!ref||/^(?:https?:|data:|\/\/)/.test(ref))continue;
 requireFile(ref);
}
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'characters/gmww40/catalog.json'),'utf8'));
if(catalog.characters?.length!==40)throw Error('Expected all 40 characters');
for(const c of catalog.characters){
 for(const rel of [c.atlas,c.original]){
  const file='characters/gmww40/'+rel;requireFile(file);
  if(hash(path.join(root,file))!==hash(path.join('assets',file)))throw Error('Character hash mismatch '+file);
 }
}
for(const file of ['app.js','gmww-shared-motion.js','runtime-recovery.js','gmww-local-export.js','status-visuals.js','status-visuals.css','battle-controls.js']){
 requireFile(file);
 if(hash(path.join(root,file))!==hash(path.join('server-game/current',file)))throw Error('Runtime hash mismatch '+file);
}
console.log('Verified native startup dependencies, current runtime hashes and all 40 Character assets');
