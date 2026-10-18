// Character 21 V6.05 — isolated GM/Player preview gateway. Does NOT change game account/room data.
// Opt-in requires both a non-production host and a dedicated staging binding (not in production config).
import accepted from '../assets/characters/overhaul-v600/character-21-v605-accepted.json' with {type:'json'};
const PREFIX='/api/character-v605/';
const ASSET_ROOT='/characters/overhaul-v600/character-21/';
const ASSETS=Object.freeze({
 avatar:{file:'avatar.webp',mime:'image/webp'},
 skin:{file:'skin.glb',mime:'model/gltf-binary'},
 renderer:{file:'renderer.html',mime:'text/html; charset=utf-8'}
});
const ID='character-21';
export function characterV605PreviewHost(hostname){
 const host=String(hostname||'').toLowerCase();
 return host==='localhost'||host==='127.0.0.1'||(/^gmww-character[0-9a-z-]*-(?:staging|preview)\.williampham0702\.workers\.dev$/.test(host));
}
export function characterV605Enabled(env,url){
 return String(env?.GMWW_CHAR21_STAGING||'')==='1'&&characterV605PreviewHost(url.hostname);
}
export function characterV605PreviewCatalog({origin=''}={}){
 const base=String(origin||'');
 return {ok:true,stage:'character-v605',active:false,readOnly:true,version:'V6.05',
  totalApproved:1,characters:[{id:ID,name:'Character 21 · V6.05',body:'muscular-chibi',
   source:'owner-accepted-iphone-2026-10-18',
   imageUrl:base+PREFIX+ID+'/avatar',modelUrl:base+PREFIX+ID+'/skin',
   rigJointCount:16,directions:8,actions:['Idle','Walk','Run','Result'],
   frameCount:1,animationType:'glb-4-clips',productionEnabled:false}]};
}
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'*'};
export async function characterV605PreviewRoute(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(PREFIX))return null;
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{...headers,allow:'GET, HEAD'}});
 if(!characterV605Enabled(env,url))return new Response('Not found',{status:404,headers});
 if(url.pathname===PREFIX+'catalog'){
  return Response.json(characterV605PreviewCatalog(),{headers});
 }
 const match=url.pathname.match(/^\/api\/character-v605\/character-21\/(avatar|skin|renderer)$/);
 if(!match)return new Response('Not found',{status:404,headers});
 if(!env?.ASSETS)return new Response('Preview asset binding unavailable',{status:503,headers});
 const kind=ASSETS[match[1]],assetUrl=new URL(request.url);
 assetUrl.pathname=ASSET_ROOT+kind.file;assetUrl.search='';
 try{
  const result=await env.ASSETS.fetch(new Request(assetUrl.toString(),{method:'GET'}));
  if(!result.ok)return new Response('Approved asset missing',{status:result.status===404?404:503,headers});
  return new Response(request.method==='HEAD'?null:result.body,{status:200,headers:{...headers,'content-type':kind.mime,'x-gmww-character-id':accepted.characterId,'x-gmww-preview':'true'}});
 }catch{
  return new Response('Preview asset unavailable',{status:503,headers});
 }
}
