// V3.301 (04/11/2026) — 5 lỗi chủ dự án báo khi chơi Player Web trên iPhone.
// Mỗi test gắn với đúng 1 lỗi; chỉ kiểm tra phạm vi đã sửa.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript as live} from '../src/gmww-members-live.js';

const index=readFileSync('src/index.js','utf8');
const gm=readFileSync('server-game/current/app.js','utf8');
const slice=(src,a,b)=>{const i=src.indexOf(a);assert.ok(i>=0,a+' missing');const j=src.indexOf(b,i+a.length);return src.slice(i,j<0?undefined:j)};

// Lỗi 1: một rule !important ghim icon hành động xuống đáy màn hình, bỏ qua vị trí đống lửa.
test('1. action icons have one fixed home (V3.304: entrance stairs above the bottom menu), not a stale drag offset',()=>{
  assert.doesNotMatch(live,/#gmwwOnlineDock\{top:calc\(var\(--gmww-player-visible-top/,'no !important bottom pin');
  const place=slice(live,'function gmwwOnlinePlaceAtFire(dock)','\nfunction ');
  assert.match(place,/getElementById\('gmwwOnlineFooter'\)/);
  assert.match(place,/dock\.style\.left=.*dock\.style\.top=/s);
  assert.match(live,/window\.addEventListener\('resize',replace/,'re-anchored when the viewport changes');
});

// Lỗi 2: mỗi pointermove đọc layout trong iframe + transition left/top → giật, trễ.
test('2. drag paints once per frame with a GPU transform and cached hit boxes',()=>{
  assert.doesNotMatch(live,/\.gmww-online-ghost\{[^}]*transition:left/,'no laggy left/top easing on the carried icon');
  const down=slice(live,'function gmwwOnlineIconDown','function gmwwOnlineTurnEffects');
  const move=slice(down,'const move=e=>','const cleanup=');
  assert.doesNotMatch(move,/gmwwOnlineTargetAt|gmwwOnlinePlayerCenter|targetAt\(/,'no iframe hit-test inside pointermove');
  assert.match(move,/requestAnimationFrame\(paint\)/);
  assert.match(down,/translate3d\(/);
  assert.match(down,/now-hitAt>350/,'iframe geometry refreshed at most every 350 ms');
  assert.ok(down.indexOf('commitGhost();')<down.indexOf('gmwwOnlineFlyGhost(ghost,c,true)'),'position committed before the absorb animation');
  // Hit test keeps the old semantics: player under the finger first, else nearest within radius.
  const snap=slice(live,'function gmwwOnlineTargetSnapshot()','function gmwwOnlineTargetAt');
  assert.match(snap,/Math\.max\(55,Math\.min\(115,/);
});

// Lỗi 3: chỉ vai đang hành động nghe audio (vừa chạm màn hình); người khác bị iOS chặn autoplay
// và chỉ nhận audioUrl ở lần poll sau.
test('3. every player is pushed the turn audio and plays it through unlocked WebAudio',()=>{
  // V3.303 thay luồng tải-theo-lượt bằng thư viện audio do Server tự đẩy (xem test v3303).
  assert.match(index,/if\(saved\.ok&&meta\?\.phase==='running'\)await this\.syncAnnouncementCue\(false\)/,'a stored clip is pushed to every socket');
  assert.match(live,/if\(d\.type==='announcement_ready'\)\{[^}]*gmwwChatAnnounce\(d\.audioCue\);return\}/);
  const play=slice(live,'async function gmwwPlayAnnouncement()','function gmwwDecodeAnnouncement');
  assert.ok(play.indexOf('gmwwPlayAnnouncementBuffers(blobs,generation,pending)')<play.indexOf('gmwwPlayAnnouncementHtml('),'WebAudio first, HTMLAudio fallback');
  const buf=slice(live,'async function gmwwPlayAnnouncementBuffers','async function gmwwPlayAnnouncementHtml');
  assert.match(buf,/g\.connect\(gmwwAudioMaster\)/);
  assert.match(buf,/gmwwPlayerCueKey=pending\.key/);
  assert.match(slice(live,'function gmwwStopAnnouncementSources()','\n'),/src\.stop\(0\)/,'next turn stops the previous voice');
});

// Lỗi 4: đồng hồ, khung chat thu gọn và Khôi phục không cùng chiều cao; bỏ icon ↶.
test('4. footer row: clock, collapsed chat and text-only Khôi phục share one height',()=>{
  assert.match(live,/undo\.textContent='Khôi phục'/);
  assert.doesNotMatch(live,/undo\.innerHTML='<span aria-hidden="true">↶/);
  assert.match(live,/#gmwwOnlineFooter\{[^}]*--gmww-foot-h:44px;display:grid;grid-template-columns:54px minmax\(0,1fr\) 54px/);
  assert.match(live,/\.gmww-foot-button\{box-sizing:border-box;height:var\(--gmww-foot-h\);min-height:var\(--gmww-foot-h\)/);
  assert.match(live,/#gmwwChatPanel:not\(\.open\)\{box-sizing:border-box;height:var\(--gmww-foot-h\)!important;min-height:var\(--gmww-foot-h\)!important;max-height:var\(--gmww-foot-h\)!important/);
});

// Lỗi 5: GM app quay lại từ nền vẫn hiện lượt cũ cho tới khi socket tự nối lại (backoff tới 10 s).
test('5. GM Runtime resyncs at once on resume and when the turn deadline passes silently',()=>{
  assert.match(gm,/const VERSION='3\.(?:30[2-9]|3[12][0-9])'/);
  for(const ev of ["document.addEventListener('visibilitychange',playResumeRealtime)","window.addEventListener('pageshow',playResumeRealtime)","window.addEventListener('focus',playResumeRealtime)"])
    assert.ok(gm.includes(ev),ev);
  const resume=slice(gm,'function playResumeRealtime()','\ndocument.addEventListener');
  assert.match(resume,/playSceneRuntime\.socketFailures=0;connectPlaySocket\(\);void playSyncRoom\(true\)/);
  const stale=slice(gm,'function playRealtimeLooksStale()','\n}');
  assert.match(stale,/now-seen>8000/);
  assert.match(stale,/serverNow>deadline\+1500/);
  assert.match(gm,/socket\.readyState!==WebSocket\.OPEN\|\|playRealtimeLooksStale\(\)\)\)playSyncRoom\(false\)/);
  assert.match(gm,/if\(playSceneRuntime\.socket===ws\)playSceneRuntime\.socketMessageAt=Date\.now\(\)/);
  assert.match(gm,/playSceneRuntime\.restSyncAt=Date\.now\(\)/);
});

// Hành vi thật của watchdog (không chỉ regex).
test('5b. stale detector: quiet socket or overdue turn → resync; fresh traffic → no extra poll',()=>{
  const src=slice(gm,'function playRealtimeLooksStale()','\n}')+'\n}';
  const make=rt=>new Function('playSceneRuntime',src+'\nreturn playRealtimeLooksStale;')(rt);
  const now=Date.now();
  assert.equal(make({socketMessageAt:now-500,restSyncAt:0,nightRuntime:null})(),false);
  assert.equal(make({socketMessageAt:now-9000,restSyncAt:now-9000})(),true);
  assert.equal(make({socketMessageAt:now-2000,nightRuntime:{deadlineAt:new Date(now-3000).toISOString()}})(),true,'turn ended on Server, no next turn received');
  assert.equal(make({socketMessageAt:now-2000,nightRuntime:{deadlineAt:new Date(now+5000).toISOString()}})(),false);
});

// Bổ sung: audio tự phát không phụ thuộc chạm vào menu.
test('3b. taps on the village scene unlock audio and returning to the page resumes it',()=>{
  assert.match(live,/gmww:village-ready'\)\{syncVillageFrame\(true\);gmwwOnlinePlaceAtFire[^}]*gmwwBindVillageAudioUnlock\(\);\}/);
  const bind=slice(live,'function gmwwBindVillageAudioUnlock()','function unlockGmwwAudio');
  assert.match(bind,/doc\.addEventListener\(t,unlockGmwwAudio/);
  assert.match(live,/document\.addEventListener\('visibilitychange',gmwwAudioWake\)/);
  assert.match(live,/c\.resume\(\)\.then\(\(\)=>\{if\(gmwwAnnouncementPending/);
});
