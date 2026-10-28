// GMWW Arena 3D Phase 2 — actual V2 Core room in an isolated staging DO namespace.
// No hidden actions are read from the WebSocket; all rendered fields are public projection.
import * as THREE from '../../characters/v5/vendor/three.module.min.js';
import {rendererCommands,createPublicRendererFrame} from '../dual-renderer-core.mjs';
import {connectStagingRoom,publicGallowsScene} from './room-realtime.mjs';
import {createArenaCharacterField,ARENA_ATELIER_VERSION} from './character-atelier.mjs';
import {CHARACTER_ART_VERSION} from './character-art-direction.mjs';
import {renderQualityBudget,STAGE7_VERSION} from './stage7-expression-motion.mjs';
import {STAGE8_VERSION,normalizeRitualCue,publicRitualSummary,ritualQuality} from './stage8-ritual-director.mjs';
import {STAGE9_VERSION,createMatchSyncGate,publicMatchView,publicMatchStatus} from './stage9-match-sync.mjs';
import {STAGE10_VERSION,resolveRoleAnimation} from './stage10-role-animations.mjs';
import {createArenaAudioEngine,STAGE12_VERSION} from './stage12-audio-engine.mjs';
import {createLocalArenaVoice,STAGE15_VERSION} from './stage15-local-audio.mjs';
import {CORE_ACTION_CATALOG} from './stage11-core-catalog.mjs';
import {ritualArt,RITUAL_ART_VERSION} from './role-ritual-art.mjs';
import {createGmDashboard} from './gm-dashboard.mjs';
import {createCoastalVillage,COASTAL_VILLAGE_VERSION} from './coastal-village.mjs';
import {createArenaTrialConfig,createArenaTrialAssignments,stagingRoleAction} from './arena-acceptance-scenario.mjs';
import {arenaSceneSignature,createArenaAdaptiveQuality,arenaTargetFrameHz,ARENA_STAGE18_VERSION,createArenaPaintScheduler,ARENA_STAGE22_VERSION} from './render-optimization.mjs';
import {createArenaMobileDiagnostics,ARENA_STAGE19_VERSION} from './stage19-mobile-diagnostics.mjs';
import {createArenaSessionTrend,ARENA_STAGE23_25_VERSION} from './stage23-25-mobile-budget.mjs';
import {validateGmActionTargets,ARENA_STAGE29_VERSION} from './stage29-gm-actions.mjs';
import {projectAuthorizedGmCoreState} from './production-gm-adapter.mjs';
import {validateArenaGmContext} from './gm-native-bridge.mjs';
import {gallowsCandidateActorId} from './stage38-public-gallows.mjs';
import {createArenaGmRefreshGate} from './stage37-gm-refresh-gate.mjs';
const $=id=>document.getElementById(id);
// STAGING keeps its isolated DO visual endpoint; the official Core hostname
// uses the existing authenticated GM state. No production credentials cross origin.
const stagingHost=location.hostname.includes('arena3d-stage14-staging');
// STAGING opt-in exercises the exact production Core/GM adapter without
// touching real Production or converting the QA Worker into a live room host.
const productionCoreView=!stagingHost||new URLSearchParams(location.search).get('coreMode')==='live';
const privateGmUrl=room=>productionCoreView?'/api/gm/rooms/'+encodeURIComponent(room):
 '/api/arena-staging/rooms/'+encodeURIComponent(room)+'/gm-visuals';
const projectGmPayload=payload=>productionCoreView?projectAuthorizedGmCoreState(payload):payload;
if(productionCoreView){
  // A production room must be filled by REAL players with Core-configured roles.
  // Do not display the research-only fake-member or fixed four-role actions.
  for(const id of ['seed','deal','sample-vfx','gallery-toolbar'])$(id).hidden=true;
  $('create').textContent='Tạo phòng';
  $('gm-restore').textContent='Xác thực GM';
  $('gm-key').placeholder='Mã GM của phòng';
  document.querySelector('header h1').textContent='GMWW Arena 3D';
  document.querySelector('header small').textContent='Chơi thật · Core GMWW V2.00';
  document.title='GMWW Arena 3D · Chơi chính thức';
  $('joinlink').textContent='🎴 Player Web';
  $('[data-roster]')?.closest('.toolbar')?.setAttribute('hidden','');
  $('open-setup').hidden=false;
  $('note').textContent='Arena 3D điều khiển phòng thật bằng Core GMWW V2.00: chỉ Thành Viên thật; Vai Trò và Artifact theo ván đã cấu hình. Không tạo dữ liệu DEMO.';

}
const canvas=$('stage'),scene=new THREE.Scene(),render=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
render.outputColorSpace=THREE.SRGBColorSpace;render.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<460?1.15:1.35));
const camera=new THREE.PerspectiveCamera(42,1,.1,90);
let orbit=.5,elevation=.75,radius=20,drag=null,focusId=null,rosterSize=6,code='',gmToken='',feed=null,current=null;
let followCaster=true,pinchDistance=0;
const trackedPointers=new Map(),cameraAim=new THREE.Vector3(0,0,1.2),
  desiredAim=new THREE.Vector3(0,0,1.2);
const field=createArenaCharacterField(THREE,scene);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
field.setReducedMotion(reducedMotion);
let lastResize='',fps=0,fpsAt=performance.now(),frames=0,ballot=null,synthetic=true,lastPaint=0,visibleGmEffects=0,lowPower=false,sceneNightPreview=false;
let sceneSignature='',sceneRebuilds=0,autoQualityEnabled=true,manualLowPower=false,adaptiveLowPower=false;
let galleryPage=0,previewRitualKind=null,lastPacingHz=-1;
const qualityController=createArenaAdaptiveQuality();
const paintScheduler=createArenaPaintScheduler();
const mobileQa=createArenaMobileDiagnostics();
const privateGmRefreshGate=createArenaGmRefreshGate({minGapMs:750});
const sessionTrend=createArenaSessionTrend({maxMinutes:30});
let webglLost=false;
const matchSync=createMatchSyncGate();
const arenaAudio=createArenaAudioEngine(window.AudioContext||window.webkitAudioContext);
const localVoice=createLocalArenaVoice({createURL:file=>URL.createObjectURL(file),
  revokeURL:url=>URL.revokeObjectURL(url),AudioCtor:window.Audio});
function playArenaCastSound(cue,{syntheticPreview=false}={}){
  // GM-private Core cue, or local synthetic preview only; never public frames.
  if(!cue?.cast||(!syntheticPreview&&!gmToken)||!arenaAudio.enabled)return false;
  const cast=cue.cast;
  const profile=resolveRoleAnimation({kind:cast.kind,roleId:cast.roleId,actionId:cast.actionId,authorizedFamily:cast.visualFamily});
  const identity=[syntheticPreview?'preview':'gm',current?.room.matchId||'SYNTH',
    current?.room.cycleKey||'',cue.turnId,cast.startedAt,cast.actionId||''].join(':');
  if(!syntheticPreview&&localVoice.play(cast.actionId,identity,{authorizedGM:Boolean(gmToken),enabled:arenaAudio.enabled}))return true;
  return arenaAudio.play(profile,identity);
}

function applyQuality(force=false){
  const next=manualLowPower||(autoQualityEnabled&&adaptiveLowPower);
  if(next===lowPower&&!force)return;
  lowPower=next;field.setLowPower(next);village.setQuality(next);
  // Do not increase GPU resolution merely because a 30-seat snapshot arrived.
  const budget=renderQualityBudget({characters:field.actorCount,fps:fps||60,
    lowPower:next,reducedMotion});
  const ratio=Math.min(devicePixelRatio||1,innerWidth<460?1.15:1.35,budget.pixelRatioCap);
  if(Math.abs(render.getPixelRatio()-ratio)>.001){
    render.setPixelRatio(ratio);lastResize='';
  }
  field.setQualityFps(fps||60);
}
function updateAutoQualityButton(){
  const btn=$('quality-auto');btn.textContent='⚡ Tối ưu tự động: '+(autoQualityEnabled?'Bật':'Tắt');
  btn.setAttribute('aria-pressed',String(autoQualityEnabled));
}
const dashboard=createGmDashboard({container:$('gm-console'),onSelect:id=>{focusId=id;field.turnActor(id,Math.PI/2);},
  onAction:(id,...args)=>{
    if(id==='nextTurn')return void guarded('Chuyển lượt đêm theo Core',async()=>{
      const turnId=args[0];if(!turnId)throw Error('Core chưa cấp lượt đêm');
      await gm('turn',{action:'next',source:'gm',expectedTurnId:turnId});
      await feed?.refresh();await refreshPrivateGmEffects();
    });
    if(id==='coreAction')return void guarded('Hành động vai trò/Artifact qua Core',async()=>{
      const [turnId,action,targetIds]=args;
      if(!gmToken||!current?.room?.matchId||current.room.cyclePhase!=='night')
        throw Error('Chưa có lượt đêm do Core xác thực');
      if(!turnId||typeof action?.actionId!=='string')
        throw Error('Thiếu mã hành động thuộc lượt');
      const ids=validateGmActionTargets(action,targetIds);
      if(!ids)throw Error('Mục tiêu không đúng số lượng hoặc quyền tự chọn');
      const body={
        matchId:current.room.matchId,cycleKey:current.room.cycleKey,turnId,
        actorId:action.actorId,targetIds:ids,
        type:action.type||'effect_notice',actionId:action.actionId,
        clientEventId:'arena-real-'+crypto.randomUUID()
      };
      if(action.artifactId)body.artifactId=action.artifactId;
      const response=await gm('battle-action',body);
      await feed?.refresh();await refreshPrivateGmEffects();
      notice(response?.ok?'Core đã xác nhận hành động '+action.label:'Core chưa xác nhận');
    });
    if(id==='roleTrial')return void guarded('Thử diễn hoạt vai trò qua Core',async()=>{
      const [turnId,actorId,roleId,targetId]=args;
      const action=stagingRoleAction(roleId);
      if(!turnId||!actorId?.startsWith('member:')||!targetId?.startsWith('member:')||!action)
        throw Error('Thiếu lượt/nhân vật/mục tiêu hợp lệ');
      if(!current?.room.matchId||current.room.cyclePhase!=='night')throw Error('Lượt không thuộc đêm hiện tại');
      const response=await gm('battle-action',{
        matchId:current.room.matchId,cycleKey:current.room.cycleKey,turnId,
        actorId:actorId.slice(7),targetIds:[targetId.slice(7)],
        type:action.type,actionId:action.actionId,
        clientEventId:'arena-trial-'+crypto.randomUUID()});
      await refreshPrivateGmEffects();
      notice(response?.ok?'Core xác nhận lượt thử của '+roleId+'; phép được phát theo quyền GM.':'Core chưa xác nhận.');
    });
    if(id==='vote'&&args[0])chosenCandidate=args[0];
    $(id)?.click();
  },
  onToggleQuality:value=>{
    // An explicit GM choice takes priority until the viewer enables Auto again.
    autoQualityEnabled=false;manualLowPower=value===true;adaptiveLowPower=false;
    qualityController.reset();applyQuality();updateAutoQualityButton();
  }
});
let chosenCandidate=null;
$('quality-auto').onclick=()=>{
  autoQualityEnabled=!autoQualityEnabled;manualLowPower=false;adaptiveLowPower=false;
  qualityController.reset();applyQuality();updateAutoQualityButton();
};
updateAutoQualityButton();
$('camera-follow').onclick=()=>{
  followCaster=!followCaster;
  $('camera-follow').textContent='🎥 Theo lượt: '+(followCaster?'Bật':'Tắt');
};
$('camera-reset').onclick=()=>{
  orbit=.5;elevation=.75;radius=20;
  cameraAim.set(0,0,1.2);followCaster=true;
  $('camera-follow').textContent='🎥 Theo lượt: Bật';
};
const village=createCoastalVillage(THREE,scene);
// Single village: lanterns/moon/sea and fire switch lighting; seats never move at dusk.
// Chibi 3D + animation are render-only: the same authoritative V2 DTO feeds 2D and 3D.
function drawFrame(frame){
  const previousMatch=current?.room.matchId,previousCycle=current?.room.cycleKey;
  const changedRoom=current?.room.code!==frame.room.code;
  current=frame;synthetic=frame.room.code==='SYNTH';
  if(changedRoom||frame.room.phase!=='running')field.setCastingTurn(null);
  const items=rendererCommands(frame,'3d').players;
  // HTTP polling and WebSocket often repeat an identical public roster.
  // Keep existing animation instances, gestures and GPU buffers in that case.
  const nextSignature=arenaSceneSignature(frame.room,items);
  if(nextSignature!==sceneSignature){
    field.setActors(items,{seatCount:frame.room.seatCount,seatLayout:frame.room.seatLayout});
    applyQuality(true);
    sceneSignature=nextSignature;sceneRebuilds++;
    document.body.dataset.gmwwArenaSceneRebuilds=String(sceneRebuilds);
  }
  dashboard.setState(frame);
  if(changedRoom||previousMatch!==frame.room.matchId||previousCycle!==frame.room.cycleKey||
    frame.room.cyclePhase!=='morning'){
    ballot=null;field.setGallowsCandidate(null);dashboard.setBallot(null);
  }
  if(previousMatch!==undefined&&(previousMatch!==frame.room.matchId||previousCycle!==frame.room.cycleKey)){
    field.clearEffects();visibleGmEffects=0;
  }
  const phase=frame.room.phase||'lobby',cycle=frame.room.cyclePhase||'';
  const night=cycle==='night';
  village.setNight(synthetic?sceneNightPreview:night);
  $('state').textContent='Phòng '+frame.room.code+' · '+phase+' · '+(night?'Đêm ':cycle==='morning'?'Ngày ':'Vào phòng ')+(frame.room.cycleNight||0);
  $('hud').textContent=items.length+' Character · '+fps+' FPS · '+render.info.render.calls+' Draw Calls';
  document.body.dataset.gmwwLiveCount=String(items.length);
  document.body.dataset.gmwwLivePhase=String(phase);
  document.body.dataset.gmwwLiveCycle=String(cycle);
  document.body.dataset.gmwwAtelier=ARENA_ATELIER_VERSION;
  document.body.dataset.gmwwArtVersion=CHARACTER_ART_VERSION;
  document.body.dataset.gmwwStage7=STAGE7_VERSION;
  document.body.dataset.gmwwStage8=STAGE8_VERSION;
  document.body.dataset.gmwwStage9=STAGE9_VERSION;
  document.body.dataset.gmwwStage10=STAGE10_VERSION;
  document.body.dataset.gmwwStage12=STAGE12_VERSION;
  document.body.dataset.gmwwStage18=ARENA_STAGE18_VERSION;
  document.body.dataset.gmwwStage19=ARENA_STAGE19_VERSION;
  document.body.dataset.gmwwStage22=ARENA_STAGE22_VERSION;
  document.body.dataset.gmwwStage25=ARENA_STAGE23_25_VERSION;
  document.body.dataset.gmwwStage29=ARENA_STAGE29_VERSION;
  const publicView=publicMatchView(frame);
  document.body.dataset.gmwwStage9Match=publicView?.key||'';
  document.body.dataset.gmwwStage9Status=publicMatchStatus(publicView);
  document.body.dataset.gmwwStage9Alive=String(publicView?.alive||0);
  document.body.dataset.gmwwRitualArtVersion=RITUAL_ART_VERSION;
  document.body.dataset.gmwwDrawBudget=String(field.drawBudget);
  document.body.dataset.gmwwVillageScene=COASTAL_VILLAGE_VERSION;
  document.body.dataset.gmwwVillageSky=village.sky;
}
function demo(n){
  const players=Array.from({length:n},(_,i)=>{
    const a=-Math.PI/2+Math.PI*2*i/n;
    return {participantId:'synthetic-'+i,gameCharacterId:'character-'+String(galleryPage===0?i+1:i+11).padStart(2,'0'),
      seatId:i+1,positionX:50+Math.cos(a)*32,positionY:50+Math.sin(a)*29};
  });
  drawFrame(createPublicRendererFrame({room:{code:'SYNTH',phase:'lobby',seatCount:n},players}));
}
function notice(s){$('log').textContent=String(s);dashboard.notify(s);}
async function refreshPrivateGmEffects(){
  if(!gmToken||!code||!current?.room.matchId||current.room.phase!=='running')return;
  // An old request may finish after GM logs out, reconnects or changes rooms.
  // Bind the private response to the initiating GM session before touching VFX/audio.
  const session={room:code,token:gmToken,matchId:String(current.room.matchId),
    cycleKey:String(current.room.cycleKey)};
  try{
    await privateGmRefreshGate.run(session,async signal=>{
    const response=await fetch(privateGmUrl(session.room),{
      headers:{authorization:'Bearer '+session.token},cache:'no-store',signal
    });
    if(!response.ok){
      // Core is the sole authorization source. Revoke stale GM visuals on 401/403.
      if((response.status===401||response.status===403)&&
        code===session.room&&gmToken===session.token&&!signal.aborted){
        gmToken='';visibleGmEffects=0;field.clearEffects();enableGm();
        notice('Core đã từ chối quyền GM. Hãy xác thực lại để xem hành động riêng tư.');
      }
      return;
    }
    const data=projectGmPayload(await response.json());
    if(!data)return;
    if(signal.aborted||current?.room?.phase!=='running'||
      code!==session.room||gmToken!==session.token||
      String(current?.room.matchId||'')!==session.matchId||
      String(current?.room.cycleKey||'')!==session.cycleKey)return;
    if(String(data.matchId)!==String(current.room.matchId)||String(data.cycleKey)!==String(current.room.cycleKey))return;
    if(Array.isArray(data.effects)){
      field.setServerEffects(data.effects);
      visibleGmEffects=data.effects.length;
      const authorized=field.actors.map(a=>a.id);
      const normalized=normalizeRitualCue(data.casting,authorized);
      field.setCastingTurn(normalized);
      playArenaCastSound(normalized);
      // Do not expose GM-only role, animation or audio identifiers via public DOM attributes.
      // Core-authorized cues are rendered in the private GM scene only.
      const summary=publicRitualSummary(normalized);
      document.body.dataset.gmwwStage8Ritual=summary.active?(summary.kind||'waiting'):'none';
      document.body.dataset.gmwwStage8Targets=String(summary.targets);
      const quality=ritualQuality({players:authorized.length,fps,reducedMotion,lowPower});
      document.body.dataset.gmwwStage8VfxBudget=String(quality.effectTrailSegments);
      dashboard.setNightControl(data.nightControl||null);
      if(productionCoreView)showBallot(data.gallows||null);
      document.body.dataset.gmwwGmTurnActive=data.casting?.actorIds?.length?'true':'false';
    }
    });
  }catch{}
}
// Polling is GM-only. A regular Player Web/anonymous viewer never requests this endpoint.
setInterval(()=>{if(!document.hidden&&gmToken)void refreshPrivateGmEffects()},3000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)privateGmRefreshGate.reset()});

async function json(url,{method='GET',body,gm=false,token}={}){
  const headers={accept:'application/json'};
  if(body)headers['content-type']='application/json';
  if(gm)headers.Authorization='Bearer '+gmToken;
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch(url,{method,headers,cache:'no-store',body:body?JSON.stringify(body):undefined});
  let value;try{value=await response.json()}catch{throw Error('HTTP '+response.status);}
  if(!response.ok||value.ok===false)throw Error(value.message||value.error||('HTTP '+response.status));
  return value;
}
// Until the existing full Core deck/Artifact editor is rendered in 3D,
// navigate back to GMWW's authoritative configuration flow. Do NOT invent
// assignments or copy private decks into the public 3D scene.
$('open-setup').onclick=()=>{
  if(!productionCoreView)return;
  if(window.parent===window){notice('Hãy mở Arena 3D từ nút VÀO LÀNG của GMWW để dùng thiết lập ván hiện tại.');return;}
  // The selected Arena room must become the GMWW Core room BEFORE editing roles.
  // Transfer a GM bearer only to the exact official same-origin parent;
  // Core authenticates it independently. Never embed it in a URL.
  if(code&&gmToken){
    window.parent.postMessage({kind:'gmww-arena3d-adopt-room',roomCode:code,gmToken},location.origin);
  }else{
    window.parent.postMessage({kind:'gmww-arena3d-open-setup'},location.origin);
  }
};
function roomUrl(path=''){return '/api/rooms/'+encodeURIComponent(code)+path;}
async function gm(path,body){if(!gmToken)throw Error('Chưa có quyền GM ở tab này. Hãy tạo phòng thử mới.');return json('/api/gm/rooms/'+encodeURIComponent(code)+'/'+path,{method:'POST',body,gm:true});}
function enableGm(){if(!gmToken){privateGmRefreshGate.reset();field.setCastingTurn(null);dashboard.setNightControl(null);document.body.dataset.gmwwGmTurnActive='false';arenaAudio.stop();localVoice.clear();}
  for(const id of ['seed','lock','deal','start','night','day','nominate','vote','end-match','winner-faction'])$(id).disabled=!gmToken||(productionCoreView&&['seed','deal'].includes(id));
  $('gm-copy').disabled=!gmToken;dashboard.setGM(Boolean(gmToken));}
async function attach(room){
  privateGmRefreshGate.reset();field.clearEffects();syntheticCastSeq++;matchSync.reset();
  if(feed)feed.close();
  code=room.trim().toUpperCase();$('room').value=code;
  const state=await json(roomUrl());
  $('joinlink').href='/join/'+encodeURIComponent(code);
  $('join3d').href='./player.html?room='+encodeURIComponent(code);
  const query=new URL(location.href);query.searchParams.set('room',code);history.replaceState(null,'',query);
  const initial=createPublicRendererFrame(state);
  if(matchSync.accept(initial,{source:'snapshot'}).accepted)drawFrame(initial);
  feed=connectStagingRoom({roomCode:code,loadPublicGallows:!productionCoreView,onFrame:frame=>{
    const result=matchSync.accept(frame,{source:'realtime'});
    if(result.accepted)drawFrame(frame);
    if(result.accepted&&gmToken)void refreshPrivateGmEffects();
  },
    onGallows:updated=>{ballot=updated;showBallot(updated);},onStatus:s=>$('connection').textContent=s,
    onError:e=>notice('Lỗi kết nối '+String(e.message||e))});
  notice('Đã kết nối phòng '+code+' trên Core V2'+(productionCoreView?' chính thức.':' STAGING.')+' Mở Player Web tại liên kết phía trên.');
  enableGm();
}
function showBallot(x){
  const previous=ballot;
  ballot=x||null;
  const save=Math.max(0,Number(x?.voteTotals?.save??x?.save)||0);
  const kill=Math.max(0,Number(x?.voteTotals?.kill??x?.kill)||0);
  dashboard.setBallot(x?{...x,save,kill}:null);
  const gallowsId=gallowsCandidateActorId(x,current);
  field.setGallowsCandidate(gallowsId);
  if(!x){$('ballot').textContent='Lên Giàn: chưa bắt đầu trong ngày hiện tại';document.body.dataset.gmwwLiveBallot='none';return;}
  const scores=(x.nominationTotals||[]).map(t=>t.loginId+': '+t.votes).join(' · ');
  if(gallowsId&&(previous?.candidateId!==x.candidateId||previous?.stage!==x.stage))
    field.interact(gallowsId,{effect:'vote',durationMs:1300});
  $('ballot').textContent='Lên Giàn '+x.stage+' · '+(x.candidateId||'chưa chọn')+
    ' · '+scores+' · 👍 '+save+' / 👎 '+kill+(x.outcome?' · '+x.outcome:'');
  document.body.dataset.gmwwLiveBallot=x.stage;
}
async function guarded(label,work){try{notice(label+' ...');await work();}catch(error){notice(label+': '+String(error.message||error));}}
$('create').onclick=()=>guarded('Tạo phòng STAGING',async()=>{
  if(feed)feed.close();feed=null;gmToken='';seeded=[];enableGm();
  const d=await json('/api/rooms',{method:'POST',body:{roomName:(productionCoreView?'Arena 3D ':'Arena 3D STAGING ')+rosterSize,roomMode:'online',seatCount:rosterSize,seatMoveMode:'instant'}});
  gmToken=d.gmToken;$('gm-key').value=gmToken;await attach(d.roomCode);
});
$('connect').onclick=()=>guarded('Kết nối phòng',()=>{gmToken='';enableGm();return attach($('room').value)});
$('refresh').onclick=()=>guarded('Đồng bộ lại',async()=>{if(feed)await feed.refresh();else if(code)await attach(code);});
$('gm-restore').onclick=()=>guarded('Xác thực quyền GM Staging',async()=>{
  if(!code)throw Error('Hãy chọn phòng trước');
  const candidate=String($('gm-key').value||'').trim();
  if(!candidate)throw Error('Chưa nhập mã GM Staging');
  const resp=await fetch(privateGmUrl(code),{
    headers:{authorization:'Bearer '+candidate},cache:'no-store'
  });
  if(!resp.ok)throw Error('Mã GM không hợp lệ ('+resp.status+')');
  gmToken=candidate;enableGm();$('gm-key').value='';
  await refreshPrivateGmEffects();
  notice('Đã xác thực GM với Core phòng; mã chỉ giữ trong bộ nhớ tab.');
});
$('gm-copy').onclick=()=>guarded('Sao chép mã GM Staging',async()=>{
  if(!gmToken)throw Error('Bạn chưa là GM');
  await navigator.clipboard.writeText(gmToken);
  notice('Đã sao chép mã GM Staging. Không chia sẻ với người chơi.');
});
// Official GMWW Runtime can provide the already-authorized room context to its
// own 3D iframe. The GM key is never serialized into URL, HTML or local storage.
let nativeBridgeSerial=0;
if(productionCoreView&&window.parent!==window){
  window.addEventListener('message',async event=>{
    const bridged=validateArenaGmContext(event.data,{
      origin:event.origin,expectedOrigin:location.origin,
      sourceIsParent:event.source===window.parent,hasParentFrame:true
    });
    if(!bridged)return;
    const serial=++nativeBridgeSerial;
    try{
      // Never accept a token merely because a native frame sent it.
      // The SAME live Core RoomDurableObject verifies bearer permission.
      const verified=await fetch(privateGmUrl(bridged.roomCode),{
        headers:{authorization:'Bearer '+bridged.gmToken},cache:'no-store'
      });
      if(!verified.ok)throw Error('Core từ chối quyền GM ('+verified.status+')');
      const state=await verified.json();
      if(!state?.ok||serial!==nativeBridgeSerial)return;
      if(code!==bridged.roomCode){
        gmToken=bridged.gmToken;
        await attach(bridged.roomCode);
      }else{
        gmToken=bridged.gmToken;
        enableGm();
      }
      $('gm-key').value='';
      await refreshPrivateGmEffects();
      notice('Đã liên kết phòng GMWW '+bridged.roomCode+' với Arena 3D. Quyền do Core xác thực.');
    }catch(error){
      if(serial!==nativeBridgeSerial)return;
      gmToken='';enableGm();
      notice('Chưa kết nối GM Arena 3D: '+String(error.message||error));
    }
  });
  // Only a non-sensitive handshake leaves the Arena frame. The parent sends
  // its room bearer to the exact official Worker origin, never to STAGING.
  // Source/origin/room token are then verified by the official Core.
  window.parent.postMessage({kind:'gmww-arena3d-ready'},'*');
}
let seeded=[];
$('seed').onclick=()=>guarded('Lấp Seat trống bằng thành viên thử',async()=>{
  if(productionCoreView)throw Error('Chỉ dành cho phòng STAGING, không tạo người giả trong phòng chính thức');
  if(!code||!gmToken)throw Error('Hãy tạo phòng trước');
  await feed?.refresh();
  const room=feed?.state.current?.room,players=feed?.state.current?.players||[];
  if(room?.seatsLocked||room?.phase==='running')throw Error('Phòng đã vào trận');
  const n=Math.min(Number(room?.seatCount)||rosterSize,30),used=new Set(players.map(x=>x.seatId).filter(Boolean));
  const free=Array.from({length:n},(_,i)=>i+1).filter(seat=>!used.has(seat));
  // A real Player Web member may have joined without picking a seat yet:
  // seat these existing people FIRST so creating fake users never crowds them out.
  for(const p of players.filter(x=>!x.seatId)){
    const seatId=free.shift();if(!seatId)throw Error('Không đủ Seat cho thành viên hiện tại');
    await gm('seat',{participantId:p.id,seatId});
  }
  let added=0;
  for(const seatId of free){
    const loginId='ar'+code.toLowerCase()+'p'+String(seatId).padStart(2,'0');
    if(seeded.some(x=>x.loginId===loginId))continue;
    notice('Đăng ký người thử ở Seat '+seatId+'/'+n);
    const account=await json('/api/members/register',{method:'POST',body:{
      loginId,displayName:'Arena '+code+' '+seatId,gameCharacterId:'character-'+String(seatId).padStart(2,'0')
    }});
    const joined=await json(roomUrl('/join'),{method:'POST',body:{token:account.token}});
    const participantId=joined.player?.participantId;
    if(!participantId)throw Error('Thiếu participantId từ Core');
    seeded.push({loginId,participantId,token:account.token});
    await gm('seat',{participantId,seatId});added++;
  }
  await feed?.refresh();notice('Đã bổ sung '+added+' người thử; người đang tham gia Player Web được giữ nguyên và ưu tiên Seat.');
});
$('lock').onclick=()=>guarded('Khóa Seat',async()=>{await gm('seat-lock',{locked:true});await feed?.refresh();notice('Đã khóa Seat trên Core staging.');});
$('deal').onclick=()=>guarded('Phát Vai thử bằng Core V2',async()=>{
  if(productionCoreView)throw Error('Chỉ dành cho STAGING; phòng chính thức dùng phân vai Core GMWW hiện hành');
  await feed?.refresh();
  const people=(feed?.state.current?.players||[]).filter(p=>p.id.startsWith('member:'));
  if(!people.length)throw Error('Chưa có thành viên nào trong phòng');
  const matchId='arena-'+crypto.randomUUID();
  const cfg=createArenaTrialConfig(people.length);
  await gm('config',{gameConfig:cfg,matchId,matchRevision:1});
  await gm('assignments',{assignments:createArenaTrialAssignments(people.map(p=>p.id.slice(7)),matchId),matchId});
  await feed?.refresh();notice('Core V2 đã Phát Vai tới '+people.length+' thành viên. Người xem 3D không nhận thẻ vai riêng.');
});
$('start').onclick=()=>guarded('Vào Trận',async()=>{
  const room=feed?.state.current?.room;
  await gm('start',{matchId:room?.matchId,matchRevision:room?.matchRevision||1});
  await feed?.refresh();
});
async function cycle(phase){const room=feed?.state.current?.room;
  if(room?.phase!=='running')throw Error('Phải vào trận trước khi chuyển ngày/đêm');
  const n=Math.max(1,Number(room.cycleNight||1));
  await gm('cycle',{phase,night:n,cycleKey:phase+'-'+n,source:'gm'});
  await feed?.refresh();await refreshPrivateGmEffects();
}
$('night').onclick=()=>guarded('Chuyển Đêm',()=>cycle('night'));
$('day').onclick=()=>guarded('Chuyển Ngày',()=>cycle('morning'));
$('nominate').onclick=()=>guarded('Mở đề cử',async()=>{
  await gm('gallows',{command:'mode',mode:'auto'});
  await gm('gallows',{command:'open'});
  await feed?.refresh();notice('Đã mở đề cử TỰ ĐỘNG. Người chơi trên Player Web STAGING có thể chọn theo luật Core V2.');
});
$('vote').onclick=()=>guarded('Bắt đầu bỏ phiếu',async()=>{
  const picked=chosenCandidate||dashboard.selectedId;
  chosenCandidate=null;
  const valid=(feed?.state.current?.players||[]).find(p=>p.id===picked&&p.id.startsWith('member:'));
  if(!valid)throw Error('Hãy chọn một Seat/người chơi tại mục Phòng trước khi bắt đầu bỏ phiếu');
  const candidate=valid.id.slice(7);
  await gm('gallows',{command:'begin',targetId:candidate});
  await feed?.refresh();notice('Đã đưa '+candidate+' lên giàn trong Core V2 staging.');
});
// A confirmed match result must originate from an explicitly authorized GM
// selecting a faction. Never infer the winner from the 3D display or demo.
$('end-match').onclick=()=>guarded('Kết thúc ván',async()=>{
  if(!gmToken||!code)throw Error('Phải xác thực GM trước khi kết thúc ván.');
  const room=feed?.state.current?.room;
  if(room?.phase!=='running'||!room?.matchId)throw Error('Không có ván đang chạy để kết thúc.');
  const faction=$('winner-faction').value;
  if(!['Phe Dân','Phe Sói','Phe Ba','Phe Khác'].includes(faction))
    throw Error('Hãy chọn phe thắng trước khi kết thúc ván.');
  if(!window.confirm('Xác nhận kết thúc ván '+room.matchId+' cho '+faction+'?'))return;
  await gm('end',{matchId:room.matchId,winnerFaction:faction,winner:faction});
  await feed?.refresh();$('winner-faction').value='';
  notice('Đã kết thúc ván trên Core chính thức. Phe thắng: '+faction+'.');
});
for(const button of document.querySelectorAll('[data-roster]'))button.onclick=()=>{
  rosterSize=Number(button.dataset.roster);
  for(const b of document.querySelectorAll('[data-roster]'))b.classList.toggle('active',b===button);
  if(!code)demo(rosterSize);
  else notice('Đã chọn '+rosterSize+' ghế cho phòng MỚI. Phòng hiện tại giữ số Seat Core đã cấp; tạo phòng mới để thử.');
};
document.querySelector('[data-roster="6"]').classList.add('active');
for(const button of document.querySelectorAll('[data-gallery]'))button.onclick=()=>{
  if(!synthetic){notice('Bộ sưu tập mỹ thuật chỉ chạy ở preview, không thay nhân vật người chơi trong phòng Core thật.');return;}
  galleryPage=Number(button.dataset.gallery);
  for(const b of document.querySelectorAll('[data-gallery]'))b.classList.toggle('active',b===button);
  syntheticCastSeq++;field.clearEffects();demo(rosterSize);
  notice('Đang xem Character '+(galleryPage===0?'01–30':'11–40')+'; đây là demo mỹ thuật, không thay dữ liệu phòng.');
};
document.querySelector('[data-gallery="0"]').classList.add('active');
$('sample-daynight').onclick=()=>{
  if(!synthetic){notice('Chế độ phòng thật: chỉ GM thay đổi Đêm/Ngày qua Core, không đổi cảnh bằng nút mẫu.');return;}
  sceneNightPreview=!sceneNightPreview;
  village.setNight(sceneNightPreview);
  document.body.dataset.gmwwVillageSky=village.sky;
  notice(sceneNightPreview?'Đang xem cùng làng biển vào ĐÊM, có trăng, đèn và ánh lửa.':'Đang xem cùng làng biển vào NGÀY.');
};
let syntheticCastSeq=0;
function playSyntheticRitual(requestedKind=null,{roleId='',actionId=''}={}){
  if(!synthetic){notice('Khi vào phòng thật, chỉ Core mới quyết định lượt và nhân vật được làm phép.');return;}
  syntheticCastSeq++;
  const token=syntheticCastSeq;
  const people=field.actors;
  if(!people.length)return;
  const index=(syntheticCastSeq-1)%people.length,actorId=people[index].id;
  const kind=ritualArt(requestedKind)?requestedKind:['shield','inspect','heal','attack','vote'][index%5];
  previewRitualKind=kind;
  const targetId=people[(index+2)%people.length].id;
  const now=Date.now();
  const cue={turnId:'synthetic-'+token,actorIds:[actorId],
    cast:{actorId,targetIds:[targetId],kind,roleId,actionId,startedAt:now+900,expiresAt:now+4000}};
  field.setCastingTurn({turnId:cue.turnId,actorIds:cue.actorIds});
  document.body.dataset.gmwwSyntheticCasting='standing';
  notice('Mẫu '+ritualArt(kind).label+': Character '+(index+1)+' đứng lên, bước ra trước khi thi triển.');
  setTimeout(()=>{if(token!==syntheticCastSeq||!synthetic)return;
    field.setCastingTurn(cue);
    playArenaCastSound(cue,{syntheticPreview:true});
    document.body.dataset.gmwwSyntheticCasting='casting';
    notice('Character '+(index+1)+' thi triển '+ritualArt(kind).label+' về Character '+((index+2)%people.length+1)+'.');
  },900);
  setTimeout(()=>{if(token!==syntheticCastSeq||!synthetic)return;
    field.setCastingTurn(null);
    document.body.dataset.gmwwSyntheticCasting='returning';
    notice('Character '+(index+1)+' đang đi về ghế cũ.');
  },4200);
  setTimeout(()=>{if(token!==syntheticCastSeq||!synthetic)return;
    document.body.dataset.gmwwSyntheticCasting='seated';
    notice('Nhân vật đã về đúng ghế và ngồi xuống. Nhấn tiếp để thử lượt người kế tiếp.');
  },5600);
}
$('arena-audio').onclick=()=>{
  if(arenaAudio.enabled){arenaAudio.stop();$('arena-audio').textContent='🔇 Bật tiếng phép 3D';}
  else if(arenaAudio.enableFromGesture())$('arena-audio').textContent='🔊 Tắt tiếng phép 3D';
  else notice('Trình duyệt không hỗ trợ AudioContext cho tiếng phép.');
};
window.addEventListener('pagehide',()=>{arenaAudio.stop();localVoice.clear()});
const roleAudioOptions=$('arena-audio-action');
for(const item of CORE_ACTION_CATALOG)roleAudioOptions.add(new Option(item.name,item.id));
$('arena-audio-file').onchange=()=>{
  const input=$('arena-audio-file'),file=input.files?.[0];
  if(!synthetic&&!gmToken){input.value='';notice('Chỉ GM được gán bản ghi âm thật trong phòng Core.');return}
  const actionId=String($('arena-audio-custom').value||'').trim()||roleAudioOptions.value;
  const result=localVoice.attach(actionId,file);
  input.value='';
  notice(result.ok?'Đã gắn file âm thanh thật trong tab GM. Không tải lên Server; tự xoá khi rời tab.':
    'Không thể gắn file âm thanh: '+result.error+' (MP3/WAV/OGG/AAC, tối đa 10MB).');
};
$('sample-cast').onclick=()=>playSyntheticRitual();
for(const b of document.querySelectorAll('[data-fx],[data-role-fx]'))b.addEventListener('click',()=>{
  if(!synthetic){notice('Chế độ phòng thật chỉ hiển thị hiệu ứng do Server cho phép, không kích hoạt bằng nút xem mẫu.');return;}
  playSyntheticRitual(b.dataset.fx||b.dataset.roleKind,{roleId:b.dataset.roleFx||'',actionId:b.dataset.roleAction||''});
});
function resize(){
  const rect=canvas.getBoundingClientRect(),key=rect.width+'x'+rect.height;
  if(key!==lastResize){lastResize=key;render.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
    camera.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);camera.updateProjectionMatrix()}
}
canvas.addEventListener('pointerdown',e=>{
  trackedPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(trackedPointers.size>=2){
    const [p1,p2]=[...trackedPointers.values()];
    pinchDistance=Math.max(1,Math.hypot(p1.x-p2.x,p1.y-p2.y));
    drag=null;
  }else{
    drag={x:e.clientX,y:e.clientY,moved:false};
  }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!trackedPointers.has(e.pointerId))return;
  trackedPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(trackedPointers.size>=2){
    const [p1,p2]=[...trackedPointers.values()];
    const distance=Math.max(1,Math.hypot(p1.x-p2.x,p1.y-p2.y));
    if(pinchDistance>0)radius=Math.max(10,Math.min(34,radius*pinchDistance/distance));
    pinchDistance=distance;return;
  }
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
  orbit-=dx*.007;elevation=Math.min(1.45,Math.max(.25,elevation+dy*.005));
  drag.x=e.clientX;drag.y=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
  const wasMulti=trackedPointers.size>1;
  trackedPointers.delete(e.pointerId);
  if(wasMulti||!drag){drag=null;return}
  if(!drag.moved){
    const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const id=field.pick(ray);
    if(id){focusId=id;dashboard.setSelection(id);field.turnActor(id,Math.PI/2);notice(id+' xoay 90° — chạm tiếp để quay 360°.');}
  }
  drag=null;
});
canvas.addEventListener('pointercancel',e=>{
  trackedPointers.delete(e.pointerId);drag=null;pinchDistance=0;
});
canvas.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(10,Math.min(32,radius+Math.sign(e.deltaY)))},{passive:false});
window.__GMWW_ARENA_STAGE_READONLY=()=>({count:field.actorCount,room:current?.room.code||null,phase:current?.room.phase||null,
  cyclePhase:current?.room.cyclePhase||null,matchId:current?.room.matchId||null,fps,connected:$('connection').textContent,
  ballot:ballot?.stage||null,gallowsActorId:field.gallowsActorId,drawCalls:render.info.render.calls,atelier:ARENA_ATELIER_VERSION,
  gmConsole:document.body.dataset.gmwwGmConsole,lowPower,autoQualityEnabled,sceneRebuilds,selectedId:dashboard.selectedId,
  followCaster,activeCaster:gmToken||synthetic?field.activeCaster:null,cameraRadius:radius,
  activeCasterWorld:gmToken||synthetic?field.activeCasterWorld:null,
  village:COASTAL_VILLAGE_VERSION,sky:village.sky,sceneryDrawBudget:village.staticDrawBudget,
  drawBudget:field.drawBudget,privateOverlayCount:gmToken?visibleGmEffects:0,
  spellVfx:gmToken||synthetic?field.spellVfxKind:null,
  artVersion:CHARACTER_ART_VERSION,ritualArtVersion:RITUAL_ART_VERSION,
  galleryPage:synthetic?galleryPage:null,ritualMotif:synthetic&&previewRitualKind?ritualArt(previewRitualKind)?.motif:null,
  spellPearls:gmToken||synthetic?field.spellVfxPearls:0,
  // Debug-only animation counts: never include role IDs or target IDs in public DOM.
  previewWolfHeads:synthetic?field.visibleWolfHeads:0,
  previewShieldDomes:synthetic?field.visibleShieldDomes:0,
  previewWand:synthetic?field.wandVisible:false,
  previewImpactRings:synthetic?field.visibleImpactRings:0,
  pixelRatio:render.getPixelRatio(),reducedMotion,paintTargetHz:lastPacingHz,
  soundEnabled:arenaAudio.enabled,soundPlays:gmToken||synthetic?arenaAudio.playedCount:0,
  loadedVoiceFiles:gmToken||synthetic?localVoice.count:0,
  mobileQa:mobileQa.snapshot(),sessionTrend:sessionTrend.summary(),crowdTier:field.crowdTier,webglLost,
  activeShieldDomes:gmToken||synthetic?field.visibleShieldDomes:0,
  activeWolfHeads:gmToken||synthetic?field.visibleWolfHeads:0});
// GĐ18: keep Core networking at normal cadence, but reduce GPU painting while idle.
function loop(now){
  const adaptive=qualityController.observe(now,!document.hidden);
  if(autoQualityEnabled&&adaptive!==adaptiveLowPower){
    adaptiveLowPower=adaptive;applyQuality();
  }
  const frameHz=arenaTargetFrameHz({visible:!document.hidden,
    active:field.hasActiveMotion(now),
    interacting:trackedPointers.size>0||Boolean(drag?.moved),
    lowPower,reducedMotion});
  if(frameHz!==lastPacingHz){
    lastPacingHz=frameHz;document.body.dataset.gmwwPaintTargetHz=String(frameHz);
  }
  if(paintScheduler.shouldPaint(now,frameHz,{paused:webglLost})){
    const sincePaint=lastPaint>0?now-lastPaint:null;
    lastPaint=now;
    const cpuStart=performance.now();
    resize();
    camera.position.set(Math.sin(orbit)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,
      Math.cos(orbit)*Math.cos(elevation)*radius+1.5);
    const caster=followCaster?field.activeCasterWorld:null;
    desiredAim.set(caster?Math.max(-3.7,Math.min(3.7,caster.x*.37)):0,
      0,caster?1.2+Math.max(-3.2,Math.min(3.2,(caster.z-1.2)*.37)):1.2);
    cameraAim.lerp(desiredAim,reducedMotion?.35:.12);
    camera.lookAt(cameraAim);
    if(!reducedMotion)village.animate(now);
    field.draw(now);
    render.render(scene,camera);frames++;
    mobileQa.sample({at:now,paintCpuMs:performance.now()-cpuStart,
      drawCalls:render.info.render.calls,targetHz:frameHz,
      characters:field.actorCount,pixelRatio:render.getPixelRatio()});
    // GĐ25: summarize only per-minute local browser performance. Never
    // send samples, room identifiers or authentication to the Worker.
    sessionTrend.observe({at:now,drawCalls:render.info.render.calls,
      paintCpuMs:performance.now()-cpuStart,intervalMs:sincePaint,
      targetHz:frameHz,characters:field.actorCount,
      active:field.hasActiveMotion(now)});
  }
  if(now-fpsAt>=1000){
    fps=Math.round(frames*1000/(now-fpsAt));frames=0;fpsAt=now;
    field.setQualityFps(fps);
    $('hud').textContent=field.actorCount+' Character · '+fps+' FPS · '+render.info.render.calls+' draw calls';
    document.body.dataset.gmwwStageFps=String(fps);
    document.body.dataset.gmwwDrawCalls=String(render.info.render.calls);
    document.body.dataset.gmwwQualityMode=lowPower?'saving':'smooth';
  }
  requestAnimationFrame(loop);
}
// GĐ20: WebGLRenderer restores its GPU resources. Pause painting during loss;
// preserve authoritative Core/WebSocket state, character seats and GM authorization.
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  webglLost=true;mobileQa.lost();sessionTrend.gpuLost();paintScheduler.reset();lastPaint=0;frames=0;
  notice('WebGL tạm mất. Đang giữ trạng thái ván và đợi trình duyệt khôi phục đồ họa.');
});
canvas.addEventListener('webglcontextrestored',()=>{
  webglLost=false;mobileQa.restored();sessionTrend.gpuRestored();paintScheduler.reset();lastPaint=0;lastResize='';
  qualityController.reset();field.draw(performance.now(),true);
  notice('WebGL đã khôi phục; trạng thái ván và Character được giữ nguyên.');
});
document.addEventListener('visibilitychange',()=>{
  mobileQa.visibility(document.hidden);
  sessionTrend.suspend(document.hidden);
  paintScheduler.reset();lastPaint=0;fpsAt=performance.now();frames=0;
  if(document.hidden)qualityController.observe(performance.now(),false);
  else if(!webglLost)field.draw(performance.now(),true);
});
function refreshMobileQa(){
  const info=mobileQa.snapshot();
  const text=info.sampleCount?
    'FPS đo: '+(info.measuredPaintFps??'—')+
    ' | mục tiêu: '+(info.requestedPaintHz??'—')+
    '\\nCPU vẽ p95: '+(info.paintCpuP95Ms??'—')+' ms'+
    ' | khoảng khung p95: '+(info.paintIntervalP95Ms??'—')+' ms'+
    '\\nDraw calls: '+(info.drawCalls??'—')+
    ' | Character: '+(info.characterCount??'—')+
    ' | Pixel ratio: '+(info.pixelRatio??'—')+
    '\\nMất/khôi phục WebGL: '+info.contextLosses+'/'+info.contextRestores+
    ' | mẫu: '+info.sampleCount:
    'Chưa đủ mẫu đo. Xoay camera hoặc chạy nghi lễ để lấy mẫu.';
  const trend=sessionTrend.summary();
  $('arena-diag-result').textContent=text.replaceAll('\\n',String.fromCharCode(10))+
    '\nPhiên dài: '+trend.storedWindows+' cửa sổ / '+trend.observedFrames+
    ' khung · Nhân vật tối đa: '+trend.maxCharacters;
}
$('arena-diag-refresh').onclick=refreshMobileQa;
$('arena-diag-reset').onclick=()=>{
  mobileQa.reset();sessionTrend.reset();refreshMobileQa();
};
$('arena-diag-copy').onclick=async()=>{
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
    const report=JSON.parse(mobileQa.report());
    report.sessionTrend=sessionTrend.summary();
    await navigator.clipboard.writeText(JSON.stringify(report,null,2));
    notice('Đã sao chép số đo hiệu năng ẩn danh; không có mã phòng, vai trò hay token.');
  }catch{notice('Không thể sao chép tự động. Hãy dùng nút Lấy kết quả để xem số đo.');}
};
if(!productionCoreView)demo(rosterSize);
else notice('Hãy chọn hoặc kết nối phòng GMWW thật. Arena 3D không tạo nhân vật mẫu trong chế độ chính thức.');
requestAnimationFrame(loop);
const param=new URL(location.href).searchParams.get('room');
if(param)void guarded('Khôi phục trạng thái phòng',()=>attach(param));
