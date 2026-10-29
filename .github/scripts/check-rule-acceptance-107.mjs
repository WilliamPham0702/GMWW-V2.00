// PR #584 release gate: technical CI success is not the same as full 107-card acceptance.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const REQUIRED_CRITERIA=Object.freeze([
  'executor','timing','ownership','quota','idempotency','undo','reconnect',
  'deathAndRevival','privateInformation','gmUi','playerWebUi','demo','audio',
  'crossInteractions'
]);

export function audit107(matrix,catalog,{evidenceExists=()=>true}={}){
  const problems=[],cards=Array.isArray(matrix?.cards)?matrix.cards:[],
    reference=Array.isArray(catalog?.cards)?catalog.cards:[],
    ids=new Set(),sourceIds=new Set(reference.map(x=>String(x.id||'')));
  const roles=cards.filter(x=>x.kind==='role').length,
    artifacts=cards.filter(x=>x.kind==='artifact').length;
  if(cards.length!==107||roles!==63||artifacts!==44)
    problems.push('Inventory: expected exactly 63 roles + 44 artifacts = 107');
  if(reference.length!==107||sourceIds.size!==107)
    problems.push('Reference catalog must contain 107 unique card IDs');
  let certified=0,missing=0;
  for(const card of cards){
    const id=String(card?.id||'');
    if(!id||ids.has(id))problems.push('Duplicate or blank card ID: '+id);
    ids.add(id);
    if(!sourceIds.has(id))problems.push('Unrecognized card ID: '+id);
    let fullyProven=true;
    for(const criterion of REQUIRED_CRITERIA){
      const entry=card?.acceptance?.[criterion];
      if(entry?.status!=='PASS'||!Array.isArray(entry.evidence)||!entry.evidence.length){
        missing++;fullyProven=false;
        continue;
      }
      if(entry.evidence.some(e=>typeof e!=='string'||!e.trim()||!evidenceExists(e))){
        fullyProven=false;missing++;
        problems.push(id+': missing or invalid evidence for '+criterion);
      }
    }
    if(fullyProven&&card.status==='CERTIFIED')certified++;
    else if(card.status==='CERTIFIED')problems.push(id+': CERTIFIED without complete verified criteria');
  }
  for(const id of sourceIds)if(!ids.has(id))problems.push('Missing catalog card: '+id);
  if(Number(matrix?.counts?.roles)!==63||Number(matrix?.counts?.artifacts)!==44||
    Number(matrix?.counts?.certified)!==certified)
    problems.push('Matrix counts are not synchronized with actual certified cards');
  if(certified!==107)problems.push('Release blocked: '+certified+'/107 certified; '+missing+' acceptance criteria still missing or invalid');
  return {ok:problems.length===0,certified,total:cards.length,missing,problems};
}

const currentFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===currentFile){
  const root=process.cwd();
  const matrix=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/pr584-acceptance-107.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/card-rule-catalog-20261028.json'),'utf8'));
  const report=audit107(matrix,catalog,{evidenceExists:ref=>{
    if(/^https:\/\//i.test(ref))return true;
    const clean=ref.replace(/#L\d+(?:-L\d+)?$/,'');
    return !path.isAbsolute(clean)&&!clean.includes('..')&&fs.existsSync(path.join(root,clean));
  }});
  console.log('GMWW RULE acceptance: '+report.certified+'/107 cards certified; '+report.missing+' criteria unverified.');
  for(const problem of report.problems.slice(0,25))console.error(' - '+problem);
  if(report.problems.length>25)console.error(' - ... '+(report.problems.length-25)+' additional problems');
  if(!report.ok)process.exitCode=1;
}
