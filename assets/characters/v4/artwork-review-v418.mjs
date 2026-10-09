import {V416_SLOTS} from './artwork-v416.mjs';
export const V418_GATE_VERSION='4.18';
export function reviewCoverage(manifest,accepted=[]){
 const unique=new Set((manifest?.drafts||[]).map(x=>x.id+'-'+x.direction));
 const approved=new Set(accepted.filter(x=>unique.has(x)));
 const missing=V416_SLOTS.filter(s=>!unique.has(s.id)).map(s=>s.id);
 return {total:8,sourceReady:unique.size,missing,approved:approved.size,
  canPublish:unique.size===8&&approved.size===8&&manifest?.limitations?.individualRigLayersAvailable===true&&manifest?.limitations?.ownerApproved===true};
}
export function validateMasterManifest(manifest){
 if(!manifest||!Array.isArray(manifest.drafts))throw Error('MANIFEST_REQUIRED');
 const known=new Set(V416_SLOTS.map(s=>s.id)),seen=new Set();
 for(const item of manifest.drafts){
  const id=item.id+'-'+item.direction;
  if(!known.has(id)||seen.has(id)||!/^([a-f0-9]{64})$/.test(item.sha256||''))throw Error('INVALID_MASTER_ENTRY');
  seen.add(id);
 }
 return reviewCoverage(manifest);
}
