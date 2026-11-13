// Bảng định tuyến chính của Worker (fetch).
import { authorizedPitr } from "../../gr01-pitr-auth.js";
import { GM_SYNC_TOKEN, NATIVE_SHELL_VERSION, PROJECT, UPDATE_CHANNEL_REV, VERSION } from "../config.js";
import { gameCharacterCatalog, gameCharacterImage } from "../support/characters.js";
import { isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { createRoom, gmLobbyResetAll, gmReset939, gmRoomConfig, gmRoomDelete, gmRoomEnabled, gmRoomEnd, gmRoomKick, gmRoomLock, gmRoomParticipants, gmRoomRename, gmRoomReset, gmRoomSettingsApi, gmRoomState, gmRoomsPurge, roomProxy } from "./gm-api.js";
import { gmObserverApi } from "./gm-observer-api.js";
import { avatarImage, playerPage } from "./pages.js";
import { heartbeatRoom, joinRoom, leaveRoomApi, playerArtifactActivateApi, playerArtifactViewedApi, playerDeliveryReceivedApi, playerDemoActionApi, playerDrunkDrawApi, playerGallowsApi, playerInteractionRespondApi, playerOnlineActionApi, playerOnlineUndoApi, playerPrivateState, playerRoleViewedApi, playerRoomChatApi, playerRoomChatAudioApi, playerRoomMoveApi, playerRoomMoveCompleteApi, playerRoomPostApi, playerRoomSetupApi, playerSeatSwapApi, playerThiefChooseApi, publicRoomState, readyRoom } from "./player-api.js";
import { createPlayerRoom, playerRoomOwnerApi, playerRoomRoleList, playerRoomTemplates } from "./player-room-api.js";
import { applyPublicEntryRateLimit } from "./rate-limit.js";
import { bearer, corsHeaders, j, safeJson } from "./responses.js";
import { GMWW_MEMBER_AVATARS, GMWW_MEMBER_AVATAR_IDS } from "../../gmww-avatars.js";
import { BACKUP_EXPORT_ROUTE, handleBackupExportRoute } from "../../gmww-backup-export.js";
import { CHARACTER_ENGINE_VERSION, CHARACTER_MASTER, createCharacterManifest } from "../../gmww-character-engine.js";
import { characterV4Status } from "../../gmww-character-v4.js";
import { character40Image } from "../../gmww-character40-catalog.js";
import { gmwwMembersLiveScript } from "../../gmww-members-live.js";
import { selectLegacyV350RuntimeDelta, selectVerifiedRuntimeV3100Delta, selectVerifiedRuntimeV3101Delta, selectVerifiedRuntimeV3103Delta, selectVerifiedRuntimeV3104Delta, selectVerifiedRuntimeV352Delta, selectVerifiedRuntimeV353Delta, selectVerifiedRuntimeV354Delta, selectVerifiedRuntimeV358Delta, selectVerifiedRuntimeV359Delta, selectVerifiedRuntimeV360Delta, selectVerifiedRuntimeV361Delta, selectVerifiedRuntimeV362Delta, selectVerifiedRuntimeV363Delta, selectVerifiedRuntimeV364Delta, selectVerifiedRuntimeV365Delta, selectVerifiedRuntimeV366Delta, selectVerifiedRuntimeV367Delta, selectVerifiedRuntimeV368Delta, selectVerifiedRuntimeV369Delta, selectVerifiedRuntimeV370Delta, selectVerifiedRuntimeV371Delta, selectVerifiedRuntimeV372Delta, selectVerifiedRuntimeV373Delta, selectVerifiedRuntimeV375Delta, selectVerifiedRuntimeV376Delta, selectVerifiedRuntimeV377Delta, selectVerifiedRuntimeV378Delta, selectVerifiedRuntimeV381Delta, selectVerifiedRuntimeV382Delta, selectVerifiedRuntimeV383Delta, selectVerifiedRuntimeV385Delta, selectVerifiedRuntimeV386Delta, selectVerifiedRuntimeV387Delta, selectVerifiedRuntimeV388Delta, selectVerifiedRuntimeV389Delta, selectVerifiedRuntimeV390Delta, selectVerifiedRuntimeV391Delta, selectVerifiedRuntimeV392Delta, selectVerifiedRuntimeV393Delta, selectVerifiedRuntimeV394Delta, selectVerifiedRuntimeV395Delta, selectVerifiedRuntimeV396Delta, selectVerifiedRuntimeV397Delta, selectVerifiedRuntimeV398Delta, selectVerifiedRuntimeV399Delta } from "../../gmww-ota-delta.js";
import { GAME_CHARACTER_COUNT, normalizeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { patchPrivatePlayerCards } from "../../gmww-player-private-card-patch.js";
import { releaseBases } from "../../gmww-release-bases.js";
import { selectBuildVerifiedManifest, selectCatalogDelta } from "../../gmww-release-catalog-policy.js";
import { releaseCatalog } from "../../gmww-release-catalog.js";
import { recoverLegacyRuntimeManifest } from "../../gmww-runtime-recovery.js";
import { publicEntryPolicy } from "../../gmww-security-admission.js";
import { fetchCanonicalRoleArtwork } from "../../gmww-template-artwork-source.js";
import { isRuntimePackageReady } from "../../gmww-update-readiness.js";
import { gmwwManifestNotesForInstalled } from "../../gmww-update-release-notes.js";
import { gmPackageCanonicalTemplateRole, gmPreloadSharedArtifacts, gmPreloadTemplateAssets } from "./gm-assets-api.js";

export default {async fetch(request,env){
  const url=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders()});
  if(url.pathname===BACKUP_EXPORT_ROUTE)return handleBackupExportRoute(request,env,authorizedPitr);
  // The Player's village runs inside an iframe at /village/?embed=1.
  // With Cloudflare Assets html_handling=none, /village/ does not resolve to
  // /village/index.html automatically. Forward this exact entry and its static
  // resources through the ASSETS binding, not the generic Player 404 route.
  if((url.pathname==="/village"||url.pathname.startsWith("/village/"))&&
     (request.method==="GET"||request.method==="HEAD")){
    if(!env.ASSETS)return new Response("Village assets unavailable",{status:503,headers:{"cache-control":"no-store"}});
    if(url.pathname==="/village"||url.pathname==="/village/"){
      const entryUrl=new URL(request.url);
      entryUrl.pathname="/village/index.html"; // keep ?embed=1 for the village UI
      const entry=await env.ASSETS.fetch(new Request(entryUrl.toString(),request));
      if(!entry.ok)return new Response("Village entry not ready",{status:503,headers:{"cache-control":"no-store"}});
      const headers=new Headers(entry.headers);
      headers.set("content-type","text/html; charset=UTF-8");
      headers.set("cache-control","no-store");
      return new Response(entry.body,{status:200,headers});
    }
    return env.ASSETS.fetch(request);
  }
  // Serve OTA files through the same ASSETS binding used by manifest readiness.
  // This avoids advertising an asset that a different static/CDN route cannot serve.
  if((url.pathname.startsWith("/updates/runtime/")||url.pathname==="/updates/latest.json")&&
     (request.method==="GET"||request.method==="HEAD")){
    if(!env.ASSETS)return new Response("Runtime assets unavailable",{status:503});
    return env.ASSETS.fetch(request);
  }
  // CORS-safe access to the exact canonical role artwork bundled with the current Runtime.
  // Native WKWebView can display local images but reject fetch(file://) during template packaging.
  const templateRoleArtwork=url.pathname.match(/^\/api\/gm\/template-role-artwork\/([A-Za-z0-9_-]{1,120})$/);
  if(templateRoleArtwork&&request.method==="GET"){
    if(!env.ASSETS)return j({ok:false,error:"RUNTIME_ARTWORK_UNAVAILABLE"},503);
    try{
      const asset=await fetchCanonicalRoleArtwork(env.ASSETS,request.url,templateRoleArtwork[1],VERSION);
      if(!asset.ok)return j({ok:false,error:"ROLE_ARTWORK_NOT_FOUND"},asset.status===404?404:503);
      return new Response(asset.body,{status:200,headers:{...corsHeaders(),"content-type":"image/webp","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
    }catch{return j({ok:false,error:"RUNTIME_ARTWORK_UNAVAILABLE"},503)}
  }
  const admissionPolicy=publicEntryPolicy(request.method,url.pathname);
  if(admissionPolicy){
    const admissionResponse=await applyPublicEntryRateLimit(env,request,admissionPolicy);
    if(admissionResponse)return admissionResponse;
  }
  if(url.pathname==="/gmww-members-live.js"&&request.method==="GET")return new Response(patchPrivatePlayerCards(gmwwMembersLiveScript).replaceAll("__GMWW_WEB_VERSION__",VERSION),{headers:{"content-type":"application/javascript; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff"}});
  if(url.pathname==="/api/health"&&request.method==="GET")return j({ok:true,project:PROJECT,service:"GMWW Online",status:"online",version:VERSION,serverVersion:VERSION,webVersion:VERSION,runtimeVersion:VERSION});
  if(url.pathname==="/api/health/deep"&&request.method==="GET"){
    try{
      const ready=await memberStore(env).fetch("https://member.internal/health/storage");
      if(!ready.ok)return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503);
      return j({ok:true,project:PROJECT,status:"ready",version:VERSION,checks:{memberStorage:"ready"}});
    }catch{return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503)}
  }
  if(url.pathname==="/api/character-engine/manifest"&&request.method==="GET")return j({ok:true,engineVersion:CHARACTER_ENGINE_VERSION,master:{...CHARACTER_MASTER,motionSet:["idle","walk","run","turn"]},characters:createCharacterManifest().map(c=>({...c,motions:["idle","walk","run","turn"]}))});
  if(url.pathname==="/api/update/manifest"&&request.method==="GET"){
    const onlyNewNotes=m=>gmwwManifestNotesForInstalled(m,url.searchParams.get("current"));
    // Packaging verifies all bytes before embedding the catalog in this bundle.
    // No mutable storage/cache/subrequest is needed for update discovery.
    const packaged=await selectBuildVerifiedManifest(releaseCatalog,VERSION.replace(/^V/i,""),NATIVE_SHELL_VERSION);
    if(packaged){
      const installed=url.searchParams.get("current")||"";
      const candidate=releaseBases.find(c=>c?.manifest?.releaseVersion===installed);
      const base=candidate?await selectBuildVerifiedManifest(candidate,installed,NATIVE_SHELL_VERSION):null;
      return j({ok:true,...onlyNewNotes(selectCatalogDelta(packaged,base,installed)),checkedAt:new Date().toISOString(),manifestSource:"build-verified"});
    }
    if(!env.ASSETS)return j({ok:false,error:"UPDATE_MANIFEST_UNAVAILABLE"},503);
    try{
      const currentVersion=VERSION.replace(/^V/i,"");
      const currentNativeShell=NATIVE_SHELL_VERSION===currentVersion;
      const validRuntime=m=>String(m?.releaseVersion||"")===currentVersion&&String(m?.releaseType||"")==="runtime"&&String(m?.runtimeVersion||"")===currentVersion&&String(m?.shellVersion||"")===String(NATIVE_SHELL_VERSION)&&Array.isArray(m?.runtime?.files)&&m.runtime.files.length>0;
      const runtimeReady=m=>isRuntimePackageReady({assets:env.ASSETS,requestUrl:request.url,manifest:m,version:currentVersion});
      const recoverOlderInstalledRuntime=async()=>onlyNewNotes(await recoverLegacyRuntimeManifest({assets:env.ASSETS,requestUrl:request.url,version:currentVersion,shellVersion:NATIVE_SHELL_VERSION,installedVersion:url.searchParams.get("current")||""}));
      const readVersionedManifest=async()=>{
        try{
          const u=new URL(request.url);u.pathname="/updates/runtime/V"+currentVersion+"/manifest-"+UPDATE_CHANNEL_REV+".json";u.search="?v="+encodeURIComponent(VERSION)+"&channel="+encodeURIComponent(UPDATE_CHANNEL_REV)+"&ts="+Date.now();
          const rr=await env.ASSETS.fetch(new Request(u.toString(),{method:"GET",headers:{"cache-control":"no-cache"}}));
          if(!rr.ok)return null;const mm=await rr.json();return String(mm?.releaseVersion||"")===currentVersion?mm:null
        }catch{return null}
      };

      // Runtime shells must not depend on latest.json being fresh at every edge.
      // Prefer the immutable, versioned manifest first so an installed older runtime
      // can always discover and install the current runtime release.
      if(!currentNativeShell){
        const versioned=onlyNewNotes(await readVersionedManifest());
        if(validRuntime(versioned)&&await runtimeReady(versioned))return j({ok:true,...(selectVerifiedRuntimeV3104Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3103Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3101Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3100Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV399Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV398Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV397Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV396Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV395Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV394Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV393Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV392Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV391Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV390Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV389Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV388Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV387Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV386Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV385Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV383Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(versioned,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(versioned,url.searchParams.get("current"))||versioned),checkedAt:new Date().toISOString()});
      }

      const manifestUrl=new URL(request.url);manifestUrl.pathname="/updates/latest.json";manifestUrl.search="?v="+encodeURIComponent(VERSION)+"&channel="+encodeURIComponent(UPDATE_CHANNEL_REV)+"&ts="+Date.now();
      const res=await env.ASSETS.fetch(new Request(manifestUrl.toString(),{method:"GET",headers:{"cache-control":"no-cache"}}));
      if(!res.ok){
        if(!currentNativeShell){const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);}
        return j({ok:false,error:currentNativeShell?"UPDATE_MANIFEST_NOT_FOUND":"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},currentNativeShell?404:503);
      }
      const manifest=onlyNewNotes(await res.json());
      const nativeManifest=()=>({
        ...manifest,
        releaseVersion:currentVersion,
        releaseType:"native",
        shellVersion:currentVersion,
        minimumShellVersion:currentVersion,
        runtimeVersion:currentVersion,
        webVersion:currentVersion,
        serverVersion:currentVersion,
        required:false,
        restartRequired:false,
        message:"GMWW V"+currentVersion+" yêu cầu cài IPA mới.",
        runtime:{files:[]},
        ipa:{
          version:currentVersion,
          fileName:"GMWW-V"+currentVersion+".ipa",
          url:"https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v"+currentVersion+"/GMWW-V"+currentVersion+".ipa"
        },
        checkedAt:new Date().toISOString()
      });
      const latestMismatch=String(manifest?.releaseVersion||"")!==currentVersion;
      const latestLostRuntime=!latestMismatch&&String(manifest?.releaseType||"")==="server_only"&&String(manifest?.shellVersion||"")&&String(manifest.shellVersion)!==currentVersion;
      if(!currentNativeShell){
        if(validRuntime(manifest)&&await runtimeReady(manifest))return j({ok:true,...(selectVerifiedRuntimeV3104Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3103Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3101Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3100Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV399Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV398Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV397Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV396Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV395Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV394Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV393Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV392Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV391Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV390Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV389Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV388Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV387Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV386Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV385Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV383Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(manifest,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(manifest,url.searchParams.get("current"))||manifest),checkedAt:new Date().toISOString()});
        const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);
        return j({ok:false,error:"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},503);
      }
      if(latestMismatch||latestLostRuntime){
        const versioned=onlyNewNotes(await readVersionedManifest());
        if(versioned&&String(versioned?.releaseType||"")!=="server_only")return j({ok:true,...versioned,checkedAt:new Date().toISOString()});
        return j({ok:true,...nativeManifest()});
      }
      if(latestMismatch){
        return j({ok:true,...manifest,releaseVersion:currentVersion,releaseType:"server_only",runtimeVersion:currentVersion,webVersion:currentVersion,serverVersion:currentVersion,required:false,restartRequired:false,message:"Server/Player Web đã cập nhật.",checkedAt:new Date().toISOString()});
      }
      return j({ok:true,...manifest,checkedAt:new Date().toISOString()});
    }catch(e){
      console.error("GMWW_UPDATE_MANIFEST",e);
      return j({ok:false,error:"UPDATE_MANIFEST_INVALID"},500);
    }
  }
  if((url.pathname==="/favicon.svg"||url.pathname==="/favicon.ico")&&request.method==="GET")return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#101816" d="M7 7l16 11 9-3 9 3L57 7l-4 23 4 8-9 3-3 11-13 8-13-8-3-11-9-3 4-8L7 7z"/><path fill="#74cdb5" d="M13 14l11 9 8-3 8 3 11-9-3 16 4 5-9 2-2 11-9 6-9-6-2-11-9-2 4-5-3-16z"/><path fill="#101816" d="M17 29l10 2-5 6-6-3zm30 0l-10 2 5 6 6-3zM26 41l6-4 6 4-2 5h-8l-2-5zm2 7h8l-4 6z"/></svg>`,{headers:{"content-type":"image/svg+xml; charset=UTF-8","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
  if((url.pathname==="/gmww-sea-background.png"||url.pathname==="/gmww-sea-background.webp")&&request.method==="GET"){if(!env.ASSETS)return new Response("Background asset unavailable",{status:503});const assetUrl=new URL(request.url);assetUrl.pathname="/backgrounds/gmww-village-day-v260.webp";const asset=await env.ASSETS.fetch(new Request(assetUrl,request));if(!asset.ok)return new Response("Player Web background not found",{status:404});return new Response(asset.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}});}
  if(url.pathname==="/api/assets/victory-audio"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/victory");
  if(url.pathname==="/api/assets/role-card-back"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/card-back");
  if(url.pathname==="/api/ui-settings"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/ui");
  if(url.pathname==="/api/web-sync"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/web-sync");
  if(url.pathname==="/api/gm-presence"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/gm-presence");
  if(url.pathname==="/api/gm/web-sync"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    const rr=await memberStore(env).fetch(new Request("https://member.internal/global-settings/web-sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({version:VERSION,source:body?.source||"GM_APP"})}));
    if(!rr.ok)return rr;
    const data=await rr.json();return j({ok:true,...data,version:VERSION,serverVersion:VERSION,webVersion:VERSION});
  }
  if(url.pathname==="/api/client-error"&&request.method==="POST"){
    const text=await request.text();if(text.length>3000)return j({ok:false,error:"TOO_LARGE"},413);
    let body=null;try{body=JSON.parse(text)}catch(_){}
    if(!body)return j({ok:false,error:"INVALID_JSON"},400);
    return memberStore(env).fetch(new Request("https://member.internal/client-errors",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  }
  if(url.pathname==="/api/gm/client-errors"&&(request.method==="GET"||request.method==="DELETE")){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/client-errors",{method:request.method}));
  }
  if(url.pathname==="/api/gm/storage-optimizer"&&request.method==="GET"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch("https://member.internal/storage-optimizer/stats");
  }
  if(url.pathname==="/api/gm/presence"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    const payload={online:body?.online!==false};if(Object.prototype.hasOwnProperty.call(body,"roomCode"))payload.roomCode=body.roomCode;return memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}));
  }
  if(url.pathname==="/api/gm/move"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-move",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  }
  if(url.pathname.startsWith("/api/gm/")&&url.pathname!=="/api/gm/presence"&&bearer(request)===GM_SYNC_TOKEN){
    try{await memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:'{"online":true}'}))}catch(_){}
  }
  if(url.pathname==="/api/village-scene"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/village-scene");
  const sceneImagePath=url.pathname.match(/^\/api\/village-scene\/image\/(day|night)$/);
  if(sceneImagePath&&request.method==="GET"){
    const revision=url.searchParams.get("revision")||"";
    const image=await memberStore(env).fetch("https://member.internal/global-settings/village-scene/image/"+sceneImagePath[1]+"?revision="+encodeURIComponent(revision));
    // IPA's file:// WebView must read bytes to persist its local scene pair.
    const response=new Response(image.body,image);
    response.headers.set("access-control-allow-origin","*");
    return response;
  }
  if(url.pathname==="/api/gm/village-scene"&&request.method==="PUT"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene",{method:"PUT",headers:{"content-type":"application/json"},body:request.body}));
  }
  if(url.pathname==="/api/gm/village-scene/reset"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene/reset",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
  }
  if(url.pathname==="/api/gm/village-scene/rollback"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene/rollback",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
  }
  if(url.pathname==="/api/gm/ui-settings"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON"},400);return memberStore(env).fetch(new Request("https://member.internal/global-settings/ui",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));}
  if(url.pathname==="/api/gm/assets/victory-audio"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/global-assets/victory",{method:"PUT",headers:{"content-type":"audio/mpeg"},body:request.body}));}
  if(url.pathname==="/api/gm/assets/role-card-back"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/global-assets/card-back",{method:"PUT",headers:{"content-type":"image/webp"},body:request.body}));}
  if(url.pathname==="/api/avatars"&&request.method==="GET"){
    let custom=[];try{const rr=await memberStore(env).fetch("https://member.internal/avatars/catalog");if(rr.ok){const d=await rr.json();custom=Array.isArray(d?.avatars)?d.avatars:[]}}catch(e){console.warn("GMWW_CUSTOM_AVATAR_CATALOG",e)}
    const seen=new Set(custom.map(x=>String(x?.id||"")).filter(Boolean)),builtins=GMWW_MEMBER_AVATARS.filter(x=>!seen.has(String(x.id))).map(({id,name})=>({id,name,imageUrl:`/api/avatars/${encodeURIComponent(id)}/image`,priority:0,source:"builtin"}));
    const dynamic=custom.map(x=>({...x,imageUrl:`/api/avatars/${encodeURIComponent(x.id)}/image`}));
    const avatars=[...dynamic,...builtins];return j({ok:true,source:"GMWW-9.95-card-avatar",count:avatars.length,avatars});
  }
  if(url.pathname==="/api/gm/avatars/upsert"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON"},400);
    return memberStore(env).fetch(new Request("https://member.internal/avatars/upsert",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  }
  const avatar=url.pathname.match(/^\/api\/avatars\/([^/]+)\/image$/);if(avatar&&request.method==="GET"){
    const id=decodeURIComponent(avatar[1]);if(normalizeGameCharacterId(id))return gameCharacterImage(env,id,request);if(GMWW_MEMBER_AVATAR_IDS.has(id))return avatarImage(id);
    return memberStore(env).fetch("https://member.internal/avatars/image/"+encodeURIComponent(id));
  }
  if(url.pathname==="/api/members/register"&&request.method==="POST"){const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON",message:"Dữ liệu tạo thành viên không hợp lệ."},400);return memberStore(env).fetch("https://member.internal/members/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
  if(url.pathname==="/api/members/login"&&request.method==="POST"){const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON",message:"Dữ liệu đăng nhập không hợp lệ."},400);return memberStore(env).fetch("https://member.internal/members/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
  if(url.pathname==="/api/members/password"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/password",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/reset-request"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/reset-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/create"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-create",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/edit"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-edit",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/reset-password"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/profile"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/profile",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/me"&&request.method==="GET")return memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(url.pathname==="/api/members/top3"&&request.method==="GET"){
    const cacheKey=new Request(url.origin+"/api/members/top3",{method:"GET"});
    try{const hit=await caches.default.match(cacheKey);if(hit)return hit}catch{}
    const res=await memberStore(env).fetch("https://member.internal/members/top3");
    if(!res.ok)return res;
    const out=new Response(await res.text(),{status:200,headers:{...corsHeaders(),"content-type":"application/json","cache-control":"public, max-age=60"}});
    try{await caches.default.put(cacheKey,out.clone())}catch{}
    return out;
  }
  if(url.pathname==="/api/matches"&&request.method==="GET"){const id=url.searchParams.get("matchId"),res=await memberStore(env).fetch(id?"https://member.internal/matches/get?matchId="+encodeURIComponent(id):"https://member.internal/matches/list");return new Response(await res.text(),{status:res.status,headers:{...corsHeaders(),"content-type":"application/json","cache-control":"no-store"}})}
  if(url.pathname==="/api/gm/matches"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/matches/clear",{method:"DELETE",headers:request.headers}))}
  if(url.pathname==="/api/members/logout"&&request.method==="POST")return memberStore(env).fetch(new Request("https://member.internal/members/logout",{method:"POST",headers:request.headers}));
  if(url.pathname==="/api/members/presence"&&request.method==="POST"){
    const body=await safeJson(request)||{},code=normalizeRoomCode(body.roomCode||"");let revoked=false;
    if(isValidRoomCode(code)){
      const authRes=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
      if(!authRes.ok)return authRes;
      const own=await authRes.json().catch(()=>({})),lid=normalizeLoginId(own?.member?.loginId);
      try{
        const res=await roomStub(env,code).fetch("https://room.internal/state");
        if(res.ok){
          const state=await res.json().catch(()=>({}));
          if(Array.isArray(state.players)&&!state.players.some(p=>normalizeLoginId(p?.loginId)===lid)){
            body.roomCode=null;body.ready=false;revoked=true;
          }
        }else if(res.status===404){body.roomCode=null;body.ready=false;revoked=true}
      }catch{}
    }
    const res=await memberStore(env).fetch(new Request("https://member.internal/members/presence",{method:"POST",headers:request.headers,body:JSON.stringify(body)}));
    if(revoked&&res.ok){const data=await res.json().catch(()=>({ok:true}));return j({...data,roomRevoked:true})}
    return res
  }
  if(url.pathname==="/api/gm/reset/939"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmReset939(env,request);}
  if(url.pathname==="/api/gm/members"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/members/directory");}
  if(url.pathname==="/api/gm/members/reset-ranking"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/admin-reset-ranking",{method:"POST",headers:request.headers}));}
  if(url.pathname==="/api/gm/members/history"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);try{await memberStore(env).fetch(new Request("https://member.internal/matches/clear",{method:"DELETE",headers:request.headers}))}catch(e){console.warn("GMWW_MATCH_LIBRARY_CLEAR",e)}return memberStore(env).fetch(new Request("https://member.internal/members/admin-clear-history",{method:"DELETE",headers:request.headers}));}
  const gmMemberDelete=url.pathname.match(/^\/api\/gm\/members\/([A-Za-z0-9._]+)$/);if(gmMemberDelete&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/delete",{method:"DELETE",headers:request.headers,body:JSON.stringify({loginId:decodeURIComponent(gmMemberDelete[1])})}));}
  if(url.pathname==="/api/gm/artifacts/shared"&&request.method==="GET"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch("https://member.internal/artifacts/shared/status");
  }
  if(url.pathname==="/api/gm/artifacts/shared"&&request.method==="PUT"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request);
    return memberStore(env).fetch(new Request("https://member.internal/artifacts/shared",{method:"PUT",
      headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));
  }
  if(url.pathname==="/api/gm/game-templates"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/game-templates/list");}
  if(url.pathname==="/api/gm/game-templates"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/game-templates/upsert",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));}
  const gmTemplateAssetsStatus=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets\/status$/);
  if(gmTemplateAssetsStatus&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/game-templates/assets/status?id="+encodeURIComponent(decodeURIComponent(gmTemplateAssetsStatus[1])))}
  const gmCanonicalTemplateRole=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets\/canonical$/);
  if(gmCanonicalTemplateRole&&request.method==="POST")
    return gmPackageCanonicalTemplateRole(env,decodeURIComponent(gmCanonicalTemplateRole[1]),request);
  const gmTemplateAssetPut=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets$/);
  if(gmTemplateAssetPut&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateAssetPut[1]),body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/game-templates/assets",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...body,id})}))}
  const gmTemplateGet=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)$/);if(gmTemplateGet&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateGet[1]);return memberStore(env).fetch("https://member.internal/game-templates/get?id="+encodeURIComponent(id));}
  if(gmTemplateGet&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateGet[1]);return memberStore(env).fetch(new Request("https://member.internal/game-templates/delete?id="+encodeURIComponent(id),{method:"DELETE"}));}
  if(url.pathname==="/api/gm/lobby/reset"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return gmLobbyResetAll(env,request);
  }
  if(url.pathname==="/api/gm/rooms"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/directory/rooms/list?includeEnded=1&includeDisabled=1");}
  if(url.pathname==="/api/gm/rooms"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmRoomsPurge(env,request);}
  if(url.pathname==="/api/village"&&request.method==="GET")return memberStore(env).fetch('https://member.internal/village/state');
  if(url.pathname==="/api/village/move"&&request.method==="POST")return memberStore(env).fetch(new Request('https://member.internal/village/move',{method:'POST',headers:request.headers,body:JSON.stringify(await safeJson(request)||{})}));
  const seatSwapRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/seat-swap$/);if(seatSwapRoute&&request.method==='POST')return playerSeatSwapApi(env,seatSwapRoute[1],request);
  if(url.pathname==="/api/game-characters/v4"&&request.method==="GET")return j(characterV4Status());
  if(url.pathname==="/api/game-characters"&&request.method==="GET")return j({ok:true,count:GAME_CHARACTER_COUNT,frameCount:1,motionFrameCount:48,actionFrameCount:8,motionVersion:"c40-1",characters:gameCharacterCatalog()});
  const gameCharacterFrameRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/frame\/([1-6])$/);if(gameCharacterFrameRoute&&request.method==="GET")return character40Image(env,gameCharacterFrameRoute[1],request);
  const gameCharacterImageRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/image$/);if(gameCharacterImageRoute&&request.method==="GET")return character40Image(env,gameCharacterImageRoute[1],request);
  if(url.pathname==="/api/rooms"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/directory/rooms/list");
  if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);
  if(url.pathname==="/api/player-rooms"&&request.method==="POST")return createPlayerRoom(env,url,request);
  if(url.pathname==="/api/player-rooms/templates"&&request.method==="GET")return playerRoomTemplates(env,request);
  if(url.pathname==="/api/player-rooms/roles"&&request.method==="GET")return playerRoomRoleList(env,request);
  const ownerApi=url.pathname.match(/^\/api\/player-rooms\/([A-Za-z0-9]+)\/owner\/([a-z-]+)$/);if(ownerApi)return playerRoomOwnerApi(env,ownerApi[1],ownerApi[2],request);
  const gmObserver=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/gm-observer\/(state|action|interaction|day-action|chat-mute|auto)$/);if(gmObserver)return gmObserverApi(env,gmObserver[1],gmObserver[2],request);
  const room=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);if(room&&request.method==="GET")return publicRoomState(env,room[1],request);
  const joinApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);if(joinApi&&request.method==="POST")return joinRoom(env,joinApi[1],request);
  const readyApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ready$/);if(readyApi&&request.method==="POST")return readyRoom(env,readyApi[1],request);
  const heartbeatApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/heartbeat$/);if(heartbeatApi&&request.method==="POST")return heartbeatRoom(env,heartbeatApi[1],request);
  const leaveApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/leave$/);if(leaveApi&&request.method==="POST")return leaveRoomApi(env,leaveApi[1],request);
  const peekDecide=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/peek\/decide$/);
  if(peekDecide&&request.method==='POST')return playerRoomPostApi(env,peekDecide[1],request,'/player/peek/decide',b=>({detected:b.detected===true}));
  const ghostWord=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ghost\/word$/);
  if(ghostWord&&request.method==='POST')return playerRoomPostApi(env,ghostWord[1],request,'/player/ghost/word',b=>({word:String(b.word||'')}));
  const thiefChoose=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/thief\/choose$/);
  if(thiefChoose&&request.method==='POST')return playerThiefChooseApi(env,thiefChoose[1],request);
  const drunkDraw=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/drunk\/draw$/);
  if(drunkDraw&&request.method==='POST')return playerDrunkDrawApi(env,drunkDraw[1],request);
  const gmAnnouncement=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/announcement-audio$/);
  if(gmAnnouncement&&(request.method==='PUT'||request.method==='GET'))return roomProxy(env,gmAnnouncement[1],'/gm/announcement',request);
  const playerAnnouncement=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/announcement-audio$/);
  if(playerAnnouncement&&request.method==='GET'){
    const code=normalizeRoomCode(playerAnnouncement[1]);if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);
    const session=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));
    if(!session.ok)return session;
    const data=await session.json();
    return roomStub(env,code).fetch('https://room.internal/player/announcement',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({loginId:data.member.loginId,a:url.searchParams.get('a')})});
  }
  const playerAudio=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/chat\/audio\/([a-f0-9-]{36})$/);
  if(playerAudio&&request.method==="GET")return playerRoomChatAudioApi(env,playerAudio[1],playerAudio[2],request);
  const gmAudio=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/chat\/audio\/([a-f0-9-]{36})$/);
  if(gmAudio&&request.method==="GET")return roomProxy(env,gmAudio[1],"/gm/chat/audio/"+gmAudio[2],request);
  const playerChat=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/chat$/);
  if(playerChat&&(request.method==="GET"||request.method==="POST"))return playerRoomChatApi(env,playerChat[1],request);
  const gmChat=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/chat$/);
  if(gmChat&&(request.method==="GET"||request.method==="POST"))return roomProxy(env,gmChat[1],"/gm/chat",request);
  const gmChatMute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/chat\/moderate$/);
  if(gmChatMute&&request.method==="POST")return roomProxy(env,gmChatMute[1],"/gm/chat/moderate",request);
  const playerState=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/me$/);if(playerState&&request.method==="GET")return playerPrivateState(env,playerState[1],request);
  const deliveryReceived=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/delivery\/received$/);if(deliveryReceived&&request.method==="POST")return playerDeliveryReceivedApi(env,deliveryReceived[1],request);
  const roleViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role\/viewed$/);if(roleViewed&&request.method==="POST")return playerRoleViewedApi(env,roleViewed[1],request);
  const artifactViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/viewed$/);if(artifactViewed&&request.method==="POST")return playerArtifactViewedApi(env,artifactViewed[1],request);
  const artifactActivate=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/activate$/);if(artifactActivate&&request.method==="POST")return playerArtifactActivateApi(env,artifactActivate[1],request);
  const playerInteraction=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/interaction\/respond$/);if(playerInteraction&&request.method==="POST")return playerInteractionRespondApi(env,playerInteraction[1],request);
  const playerGallowsRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/gallows$/);if(playerGallowsRoute&&request.method==="POST")return playerGallowsApi(env,playerGallowsRoute[1],request);
  const playerDemoRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/demo-action$/);if(playerDemoRoute&&request.method==="POST")return playerDemoActionApi(env,playerDemoRoute[1],request);
  const playerUndoRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/undo-action$/);if(playerUndoRoute&&request.method==="POST")return playerOnlineUndoApi(env,playerUndoRoute[1],request);
  const playerOnlineRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/action$/);if(playerOnlineRoute&&request.method==="POST")return playerOnlineActionApi(env,playerOnlineRoute[1],request);
  const playerSetup=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/setup$/);if(playerSetup&&request.method==="POST")return playerRoomSetupApi(env,playerSetup[1],request);
  const playerMove=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/move$/);if(playerMove&&request.method==="POST")return playerRoomMoveApi(env,playerMove[1],request);
  const playerMoveComplete=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/move\/complete$/);if(playerMoveComplete&&request.method==="POST")return playerRoomMoveCompleteApi(env,playerMoveComplete[1],request);
  const gmState=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)$/);if(gmState&&request.method==="GET")return gmRoomState(env,gmState[1],request);
  const gmPublish=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/publish$/);if(gmPublish&&request.method==="POST")return gmRoomState(env,gmPublish[1],request);
  const gmAssign=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/assignments$/);if(gmAssign&&request.method==="POST")return roomProxy(env,gmAssign[1],"/gm/assign",request);
  const gmStart=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/start$/);if(gmStart&&request.method==="POST")return roomProxy(env,gmStart[1],"/gm/start",request);
  const gmConfig=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/config$/);if(gmConfig&&request.method==="POST")return gmRoomConfig(env,gmConfig[1],request);
  const gmTemplatePreload=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/template-assets$/);
  if(gmTemplatePreload&&request.method==="POST")return gmPreloadTemplateAssets(env,gmTemplatePreload[1],request);
  const gmSharedArtifacts=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/shared-artifacts$/);
  if(gmSharedArtifacts&&request.method==="POST")return gmPreloadSharedArtifacts(env,gmSharedArtifacts[1],request);
  const gmRoleAssets=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/role-assets$/);if(gmRoleAssets&&request.method==="POST")return roomProxy(env,gmRoleAssets[1],"/gm/role-assets",request);
  const gmArtworkManifest=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/artwork-manifest$/);if(gmArtworkManifest&&request.method==="GET")return roomProxy(env,gmArtworkManifest[1],"/gm/artwork-manifest",request);
  const publicRoleAsset=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role-assets\/([^/]+)\/image$/);if(publicRoleAsset&&request.method==="GET"){const c=normalizeRoomCode(publicRoleAsset[1]);if(!isValidRoomCode(c))return new Response("Invalid room code",{status:400});return roomStub(env,c).fetch("https://room.internal/role-assets/"+encodeURIComponent(decodeURIComponent(publicRoleAsset[2]))+"/image")}
  const gmInteraction=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/interaction$/);if(gmInteraction&&request.method==="POST")return roomProxy(env,gmInteraction[1],"/gm/interaction",request);
  const gmBattleAction=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/battle-action$/);if(gmBattleAction&&request.method==="POST")return roomProxy(env,gmBattleAction[1],"/gm/battle-action",request);
  const gmDayActionRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/day-action$/);if(gmDayActionRoute&&request.method==="POST")return roomProxy(env,gmDayActionRoute[1],"/gm/day-action",request);
  const gmDayClockRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/day-clock$/);if(gmDayClockRoute&&request.method==="POST")return roomProxy(env,gmDayClockRoute[1],"/gm/day-clock",request);
  const gmBattleUndo=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/battle-undo$/);if(gmBattleUndo&&request.method==="POST")return roomProxy(env,gmBattleUndo[1],"/gm/battle-undo",request);
  const gmGallowsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/gallows$/);if(gmGallowsRoute&&request.method==="POST")return roomProxy(env,gmGallowsRoute[1],"/gm/gallows",request);
  const gmParticipants=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/participants$/);if(gmParticipants&&request.method==="POST")return gmRoomParticipants(env,gmParticipants[1],request);
  const gmRoomSettingsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/room-settings$/);if(gmRoomSettingsRoute&&request.method==="POST")return gmRoomSettingsApi(env,gmRoomSettingsRoute[1],request);
  const gmStageRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/stage$/);if(gmStageRoute&&request.method==="POST")return roomProxy(env,gmStageRoute[1],"/gm/stage",request);
  const gmSeatRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat$/);if(gmSeatRoute&&request.method==="POST")return roomProxy(env,gmSeatRoute[1],"/gm/seat",request);
  const gmRandomSeatsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seats\/randomize-remaining$/);if(gmRandomSeatsRoute&&request.method==="POST")return roomProxy(env,gmRandomSeatsRoute[1],"/gm/seats/randomize-remaining",request);
  const gmMoveRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/move$/);if(gmMoveRoute&&request.method==='POST')return roomProxy(env,gmMoveRoute[1],'/gm/move',request);
  const gmSeatLockRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat-lock$/);if(gmSeatLockRoute&&request.method==="POST")return roomProxy(env,gmSeatLockRoute[1],"/gm/seat-lock",request);
  const gmCycle=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/cycle$/);if(gmCycle&&request.method==="POST")return roomProxy(env,gmCycle[1],"/gm/cycle",request);
  const gmTurn=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/turn$/);if(gmTurn&&request.method==="POST")return roomProxy(env,gmTurn[1],"/gm/turn",request);
  const gmDemo=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/demo$/);if(gmDemo&&request.method==="POST")return roomProxy(env,gmDemo[1],"/gm/demo",request);
  const gmAuto=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/auto$/);if(gmAuto&&request.method==="POST")return roomProxy(env,gmAuto[1],"/gm/auto",request);
  const gmEnabled=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/enabled$/);if(gmEnabled&&request.method==="POST")return gmRoomEnabled(env,gmEnabled[1],request);
  const gmLock=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/lock$/);if(gmLock&&request.method==="POST")return gmRoomLock(env,gmLock[1],request);
  const gmKick=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/kick$/);if(gmKick&&request.method==="POST")return gmRoomKick(env,gmKick[1],request);
  const gmRename=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/rename$/);if(gmRename&&request.method==="POST")return gmRoomRename(env,gmRename[1],request);
  const gmReset=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/reset$/);if(gmReset&&request.method==="POST")return gmRoomReset(env,gmReset[1],request);
  const gmEnd=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/end$/);if(gmEnd&&request.method==="POST")return gmRoomEnd(env,gmEnd[1],request);
  const gmDelete=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/delete$/);if(gmDelete&&request.method==="POST")return gmRoomDelete(env,gmDelete[1],request);
  const gmDeleteDirect=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)$/);if(gmDeleteDirect&&request.method==="DELETE")return gmRoomDelete(env,gmDeleteDirect[1],request);
  const ws=url.pathname.match(/^\/ws\/([A-Za-z0-9]+)$/);if(ws){const c=normalizeRoomCode(ws[1]);if(!isValidRoomCode(c))return new Response("Invalid room code",{status:400});const u=new URL("https://room.internal/websocket");for(const[k,v]of url.searchParams)u.searchParams.set(k,v);return roomStub(env,c).fetch(new Request(u.toString(),{method:request.method,headers:request.headers}))}
  const proto=url.pathname.match(/^\/prototype(?:\/([A-Za-z0-9]+))?$/);if(proto&&request.method==="GET")return playerPage(normalizeRoomCode(proto[1]||""));
  const join=url.pathname.match(/^\/join\/([A-Za-z0-9]+)$/);if(join&&request.method==="GET")return playerPage(normalizeRoomCode(join[1]));
  const shortJoin=url.pathname.match(/^\/([A-Za-z0-9]+)$/);if(shortJoin&&request.method==="GET"){const c=normalizeRoomCode(shortJoin[1]);if(isValidRoomCode(c))return playerPage(c)}
  if(url.pathname==="/"&&request.method==="GET")return playerPage("");return new Response("Không tìm thấy trang",{status:404,headers:{...corsHeaders(),"content-type":"text/plain; charset=UTF-8"}});
}};
