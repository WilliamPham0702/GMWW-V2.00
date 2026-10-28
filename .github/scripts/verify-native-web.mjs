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
 if(!ref||ref==='about:blank'||/^(?:https?:|data:|\/\/)/.test(ref))continue;
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
for(const legacy of ['sea-v1','v2'])if(fs.existsSync(path.join(root,'action-icons',legacy)))throw Error('Obsolete native icon folder '+legacy);
const v3Directory=path.join(root,'action-icons','v3');
const v3Files=fs.readdirSync(v3Directory);
if(v3Files.length!==51||v3Files.some(name=>!name.endsWith('.webp')))throw Error('Missing active V3 icons');
for(const name of v3Files){
 requireFile('action-icons/v3/'+name);
 if(hash(path.join(v3Directory,name))!==hash(path.join('server-game/current/action-icons/v3',name)))throw Error('V3 icon bytes mismatch '+name);
}
console.log('Verified native startup dependencies, all 40 Character assets and lean 51 V3 icons');
