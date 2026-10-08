import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.87 keeps six discrete character sizes and removes the slider',()=>{
  const html=read('server-game/current/GMWW.html'),app=read('server-game/current/app.js'),css=read('server-game/current/style.css'),server=read('src/index.js');
  assert.ok(html.includes('id="characterScaleChoices"'));
  for(const n of [75,100,125,150,175,200]) assert.ok(html.includes('data-character-scale="'+n+'"'));
  assert.doesNotMatch(html,/characterScaleRange|type="range"/);
  assert.ok(app.includes('const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200]'));
  assert.ok(app.includes("--gmww-character-scale"));
  assert.ok(css.includes('--gmww-character-scale:1'));
  assert.ok(css.includes('width:56px!important;height:74px!important'));
  assert.ok(css.includes('transform:scale(var(--gmww-character-scale,1))'));
  assert.ok(server.includes('const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200]'));
  assert.ok(server.includes('normalizeCharacterScale(raw,100)'));
  assert.doesNotMatch(server,/globalWebVeilGet|globalWebVeilPut|global-settings\/web-veil/);
});

test('Player Web scales actor artwork only while official labels stay fixed',()=>{
  const live=read('src/gmww-members-live.js'),village=read('assets/village/village.mjs'),art=read('assets/village/village-art.css'),css=read('assets/village/village.css');
  assert.ok(live.includes('GMWW_CHARACTER_SCALES=[75,100,125,150,175,200]'));
  assert.ok(live.includes("api('/api/ui-settings')"));
  assert.ok(live.includes('characterScale:Number(state.characterScale||100)'));
  assert.ok(village.includes('CHARACTER_SCALES=[75,100,125,150,175,200]'));
  assert.ok(village.includes('avatar.style.width=baseW+"px"'));
  assert.ok(village.includes('avatar.style.height=baseH+"px"'));
  assert.ok(village.includes('button.style.minWidth=Math.max(52,baseW+10)+"px"'));
  assert.ok(village.includes('button.style.setProperty("--gmww-character-scale",String(scale))'));
  assert.ok(art.includes('scale(var(--gmww-character-scale,1))'));
  assert.match(css,/\.player \.portrait\.game-character img\{[^}]*transform:scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/\.player \.player-over\{[^}]*transform:translateX\(-50%\);/s);
  assert.doesNotMatch(css,/\.player \.player-over\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/\.player \.player-role\{[^}]*transform:none/);
  assert.doesNotMatch(css,/\.player \.player-role\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
});

test('Player tapping their own character no longer opens information',()=>{
  const live=read('src/gmww-members-live.js'),village=read('assets/village/village.mjs');
  assert.ok(live.includes('id=\\"gmwwVillageProfileButton\\"'));
  assert.ok(live.includes('id=\\"gmwwVillageProfileAvatar\\"'));
  assert.ok(live.includes('profileButton.onclick=openVillageProfile'));
  assert.doesNotMatch(live,/showPlayerSeatChoice/);
  assert.doesNotMatch(live,/if\(id===selfId\)openVillageProfile\(\)/);
  assert.ok(village.includes('if(String(data.id)!==String(setupState.viewerParticipantId||""))window.parent.postMessage'));
});

test('Player profile is compact, password-free, keeps stats and exposes collapsible history',()=>{
  const live=read('src/gmww-members-live.js'),server=read('src/index.js');
  assert.ok(live.includes('#loginPasswordBlock,#registrationPasswordToggle,#registrationPasswordFields,#reset{display:none!important}'));
  assert.ok(live.includes('#profile .change-pass,#profile .profile-enter-room{display:none!important}'));
  assert.ok(live.includes('#profile .history-fold{display:block!important'));
  assert.ok(live.includes('height:auto!important;min-height:0!important;max-height:min(76svh,560px)!important'));
  assert.ok(live.includes("const h=$('#profile .history-fold');if(h)h.open=false"));
  assert.ok(live.includes("summary.textContent='✎ THAY ĐỔI AVATAR'"));
  assert.ok(live.includes("$('#profile .stats .stat strong').forEach"));
  assert.ok(live.includes("$('#profile .profile-exit-btn,#profile .linkline button').forEach"));
  assert.ok(live.includes("$('img[data-gmww-walk-character]').forEach"));
  assert.ok(server.includes('disableMemberPassword(member)'));
  const loginStart=server.indexOf('async memberLogin(body)'),loginEnd=server.indexOf('async memberChangePassword',loginStart),login=server.slice(loginStart,loginEnd);
  assert.doesNotMatch(login,/verifyPassword|PASSWORD_REQUIRED/);
});

test('Avatar selection persists and 20 animated characters load independently of legacy avatar API',()=>{
  const live=read('src/gmww-members-live.js'),server=read('src/index.js');
  const loadStart=live.indexOf('async function loadAvatars()'),loadEnd=live.indexOf('function shuffleAvatarSuggestions',loadStart),load=live.slice(loadStart,loadEnd);
  assert.ok(load.includes('await loadGameCharacters()'));
  assert.ok(load.includes("state.gameCharacters.length+' Nhân vật động GMWW'"));
  assert.ok(live.includes("const selfId=String(state.participantId||('member:'+state.member?.loginId))"));
  const profileStart=server.indexOf('async memberUpdateProfile'),profileEnd=server.indexOf('async memberSession',profileStart),profile=server.slice(profileStart,profileEnd);
  assert.ok(profile.includes('member.gameCharacterId=requestedCharacter'));
  assert.doesNotMatch(profile,/fallbackAvatar|member\.avatarId=fallbackAvatar/);
});

test('Manual login enters the village directly with no intermediate room restore layer',()=>{
  const live=read('src/gmww-members-live.js');
  const start=live.indexOf('async function login()'),end=live.indexOf('window.login=login',start),segment=live.slice(start,end);
  assert.ok(segment.includes("saveSession(d);state.roomNavigationAuthorized=false;await enterVillage()"));
  assert.doesNotMatch(segment,/autoResumeActiveRoom/);
  assert.doesNotMatch(segment,/fallbackError|GMWW post-login/);
});

test('V3.17 runtime metadata is aligned with the V3.17 native shell',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.35"'));
  assert.ok(app.includes("const VERSION='3.35';"));
  assert.ok(html.includes('GMWW V3.35'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 317;'));
  assert.ok(project.includes('MARKETING_VERSION = 3.17;'));
  assert.equal(pkg.version,'3.35.0');
});


test('Profile avatar button opens the 20 animated-character picker and saves immediately',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("#profileEditPanel>summary,[data-gmww-avatar]"));
  assert.ok(live.includes("t.matches?.('#profileEditPanel>summary')"));
  assert.ok(live.includes("if(state.gameCharacters.length!==20){toast('Chưa tải được 20 Avatar động."));
  assert.ok(live.includes("closeAvatarLibrary();await saveProfile();return"));
  assert.ok(live.includes("catalog=state.gameCharacters"));
});

test('Session restore stays in the village and prewarms the village view',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes('async function autoResumeActiveRoom({stayInVillage=false}={})'));
  assert.ok(live.includes('if(stayInVillage){await enterVillage();return true}'));
  assert.ok(live.includes('applyRoleCardBack();ensureVillageGameView();'));
  assert.ok(live.includes('await autoResumeActiveRoom({stayInVillage:true})'));
});


test('Profile animated avatar is not overwritten by the legacy static image observer',()=>{
  const page=read('src/gmww-members-page.js'),live=read('src/gmww-members-live.js');
  assert.doesNotMatch(page,/game-characters\/['\"]?\+encodeURIComponent\(id\)\+['\"]?\/image/);
  assert.ok(page.includes("image.dataset.gmwwWalkCharacter=id"));
  assert.ok(page.includes("'/frame/1'"));
  assert.ok(page.includes("attributeFilter:['class']"));
  assert.ok(live.includes("main.dataset.gmwwWalkCharacter=editing?draftCharacter:currentCharacter"));
});

test('History row uses a single clean border without an inner summary frame',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("#profile .history-fold{display:block!important"));
  assert.ok(live.includes("border:1px solid #d7b775!important"));
  assert.ok(live.includes("border:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;background:transparent!important"));
});


test('Player session survives transient restore failures and only clears on auth rejection',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("if(e?.status===401||e?.status===403)"));
  assert.ok(live.includes("const cached=JSON.parse(localStorage.getItem('gmww_member')||'null')"));
  assert.ok(live.includes("setTimeout(()=>restore(),2500)"));
});

test('Seated characters keep a subtle idle sway without roaming',()=>{
  const css=read('assets/village/village.css');
  assert.ok(css.includes('@keyframes gmww-seated-idle-sway'));
  assert.ok(css.includes('.player.seated:not(.moving) .portrait.game-character'));
  assert.ok(css.includes('2.4s ease-in-out infinite'));
});
