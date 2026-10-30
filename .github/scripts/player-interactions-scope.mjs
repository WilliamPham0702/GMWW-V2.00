// Fail-closed scope for Player lobby/chat/menu/cards/drag and its exact V3.277 release.
const ciPaths=new Set(['.github/scripts/ci-browser-scope.mjs','.github/scripts/player-interactions-scope.mjs','.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml','tests/player-interactions-ci.test.mjs']);
const featurePaths=new Set(['.github/scripts/assemble-player-web.mjs','.github/scripts/player-server-menu.mjs','src/gmww-members-live.js','src/gmww-online-chat-policy.js','src/index.js','src/player-web-src/20-village-and-profile.part','src/player-web-src/35-online-chat.part','tests/player-lobby-chat-interactions-20261030.test.mjs','tests/player-online-privacy-bottom-dock-20261029.test.mjs','docs/releases/GMWW-PLAYER-LOBBY-INTERACTIONS-20261030.md']);
const versionEdits=new Map([
 ['package.json',['"version": "3.276.0"','"version": "3.277.0"',false]],
 ['package-lock.json',['"version": "3.276.0"','"version": "3.277.0"',true]],
 ['server-game/src/00-core-and-library.part',["const VERSION='3.276';","const VERSION='3.277';",false]],
 ['server-game/current/app.js',["const VERSION='3.276';","const VERSION='3.277';",false]],
 ['server-game/current/GMWW.html',['<title>GMWW V3.276</title>','<title>GMWW V3.277</title>',false]]
]);
function exactReplace(before,after,from,to,all=false){
 if(typeof before!=='string'||typeof after!=='string')return false;
 const count=before.split(from).length-1;
 if(count!==(all?2:1))return false;
 return (all?before.replaceAll(from,to):before.replace(from,to))===after;
}
function outsideChat(source){
 if(typeof source!=='string')return null;
 const start=source.indexOf('  async chatAccess('),end=source.indexOf('  async gmChatModerate(',start);
 if(start<0||end<0)return null;
 const outside=source.slice(0,start)+source.slice(end);
 return outside.replace('import {chatPolicy,chatNormalizeText} from "./gmww-online-chat-policy.js";','CHAT_IMPORT')
  .replace('import {chatPolicy,chatNormalizeText,chatStorageScope,publicChatNotices} from "./gmww-online-chat-policy.js";','CHAT_IMPORT');
}
function safeReleaseNotes(before,after){
 if(typeof before!=='string'||typeof after!=='string'||!before.includes('releaseNotes:["V3.276 PR630:'))return false;
 const prefix='releaseNotes:["V3.277 PR634:',suffix='","V3.276 PR630:';
 const a=after.indexOf(prefix),b=after.indexOf(suffix,a+prefix.length);
 if(a<0||b<a+prefix.length+5||b-a>1000)return false;
 return after.slice(0,a)+'releaseNotes:["V3.276 PR630:'+after.slice(b+suffix.length)===before;
}
export function playerInteractionsScope(changes){
 if(!Array.isArray(changes)||!changes.length||changes.some(c=>!['A','M'].includes(c.status)))return null;
 const names=new Set(changes.map(c=>c.path));if(names.size!==changes.length)return null;
 if(changes.length===ciPaths.size&&changes.every(c=>ciPaths.has(c.path)))return 'player-interactions-ci';
 const isFeature=changes.length===featurePaths.size&&changes.every(c=>featurePaths.has(c.path));
 const isRelease=changes.length===featurePaths.size+versionEdits.size+1&&changes.every(c=>featurePaths.has(c.path)||versionEdits.has(c.path)||c.path==='.github/scripts/prepare-update-channel.mjs');
 if(!isFeature&&!isRelease)return null;
 const worker=changes.find(c=>c.path==='src/index.js');if(!worker)return null;
 const from=outsideChat(worker.before),to=outsideChat(worker.after);
 if(from===null||to===null)return null;
 if(isFeature&&from!==to)return null;
 if(isRelease){
  if(!exactReplace(from,to,'VERSION="V3.276"','VERSION="V3.277"'))return null;
  for(const [path,[oldText,newText,all]] of versionEdits){
   const c=changes.find(c=>c.path===path);if(!c||!exactReplace(c.before,c.after,oldText,newText,all))return null;
  }
  const notes=changes.find(c=>c.path==='.github/scripts/prepare-update-channel.mjs');
  if(!notes||!safeReleaseNotes(notes.before,notes.after))return null;
 }
 return 'player-lobby-interactions';
}
