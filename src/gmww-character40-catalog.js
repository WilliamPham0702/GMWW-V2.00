import {characterStateFromPlayer as legacyCharacterStateFromPlayer} from "./gmww-character-engine.js";
export const CHARACTER40_REV='c40-1';
export const CHARACTER40_PORTRAIT_REV='c40-4';
export function character40VisualId(id){if(id==='character-41')return 'character-39';if(id==='character-42')return 'character-40';return /^character-(?:0[1-9]|[1-3][0-9]|40)$/.test(String(id))?id:null;}
export function character40Catalog(){return Array.from({length:40},(_,i)=>{const id='character-'+String(i+1).padStart(2,'0');return {id,name:'Nhân vật '+String(i+1).padStart(2,'0'),frameCount:1,motionFrameCount:48,actionFrameCount:8,imageUrl:'/api/game-characters/'+id+'/image?rev='+CHARACTER40_PORTRAIT_REV,motionAtlas:'/characters/gmww40/atlases/'+id+'.webp',motionVersion:CHARACTER40_REV,actions:['idle','walk','run','turn']};});}
export async function character40Image(env,id,request){
 const visual=character40VisualId(id);if(!visual)return new Response('Not found',{status:404});
 const u=new URL(request.url);u.pathname='/characters/gmww40/originals/'+visual+'.webp';u.search='';const asset=await env.ASSETS.fetch(new Request(u,request));
 const headers=new Headers(asset.headers);headers.set('cache-control','public, max-age=0, must-revalidate');headers.set('access-control-allow-origin','*');headers.set('x-gmww-character-revision',CHARACTER40_PORTRAIT_REV);return new Response(asset.body,{status:asset.status,headers});
}

export function character40StateFromPlayer(player,options){const c=legacyCharacterStateFromPlayer(player,options),motion=["walk","run","turn"].includes(c.motion)?c.motion:"idle";return {...c,motion,state:motion==="walk"?"walking":motion==="run"?"running":"idle",activity:motion==="idle"?"idle":c.activity};}
