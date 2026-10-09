import {V416_SLOTS} from './artwork-v416.mjs';
import {V414_LAYERS} from './skin-v414.mjs';
import {validateMasterManifest} from './artwork-review-v418.mjs';
export const V419_REQUIRED_LAYERS=8*17;
export function validateRigInventory(manifest,rigFiles=[],approved=[]){
 const master=validateMasterManifest(manifest);
 const known=new Set(V416_SLOTS.map(s=>s.id));
 const layerNames=new Set(V414_LAYERS);
 if(!Array.isArray(rigFiles)||!Array.isArray(approved))throw Error('INVALID_RIG_INVENTORY');
 const seen=new Set(),hashes=new Set(),errors=[];
 const masterHashes=new Set((manifest.drafts||[]).map(f=>f.sha256));
 if(masterHashes.size!==master.sourceReady)errors.push('DUPLICATE_MASTER_CONTENT');
 for(const f of rigFiles){
  const view=f?.characterId+'-'+f?.direction;
  const key=view+'/'+f?.layer;
  if(!known.has(view)||!layerNames.has(f?.layer)||seen.has(key)||!/^([a-f0-9]{64})$/.test(f?.sha256||'')||hashes.has(f.sha256)||masterHashes.has(f.sha256)){
   errors.push(key);continue;
  }
  seen.add(key);
  hashes.add(f.sha256);
 }
 const completeViews=V416_SLOTS.filter(s=>V414_LAYERS.every(l=>seen.has(s.id+'/'+l))).map(s=>s.id);
 const approvedViews=new Set(approved.filter(x=>known.has(x)));
 return Object.freeze({masters:master.sourceReady,masterTotal:8,rigLayers:seen.size,
  rigTotal:V419_REQUIRED_LAYERS,completeViews,approvedViews:approvedViews.size,
  errors,canPublish:master.sourceReady===8&&seen.size===V419_REQUIRED_LAYERS&&errors.length===0&&
  approvedViews.size===8&&manifest.limitations?.individualRigLayersAvailable===true&&
  manifest.limitations?.importedIntoRepository===true&&manifest.limitations?.motionRigged===true&&
  manifest.limitations?.ownerApproved===true&&
  manifest.limitations?.productionSkinEnabled===true});
}
