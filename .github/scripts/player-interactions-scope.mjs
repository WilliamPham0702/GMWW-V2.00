// Scope only the lobby/chat/menu/card/action follow-up. Unknown files fail closed.
const ciPaths=new Set(['.github/scripts/ci-browser-scope.mjs','.github/scripts/player-interactions-scope.mjs','.github/workflows/check-player-web.yml','tests/player-interactions-ci.test.mjs']);
const featurePaths=new Set(['.github/scripts/assemble-player-web.mjs','.github/scripts/player-server-menu.mjs','src/gmww-members-live.js','src/gmww-online-chat-policy.js','src/index.js','src/player-web-src/20-village-and-profile.part','src/player-web-src/35-online-chat.part','tests/player-lobby-chat-interactions-20261030.test.mjs','tests/player-online-privacy-bottom-dock-20261029.test.mjs','docs/releases/GMWW-PLAYER-LOBBY-INTERACTIONS-20261030.md']);
function outsideChat(source){
 if(typeof source!=='string')return null;
 const start=source.indexOf('  async chatAccess('),end=source.indexOf('  async gmChatModerate(',start);
 if(start<0||end<0)return null;
 return (source.slice(0,start)+source.slice(end)).replace(/import \{chatPolicy,chatNormalizeText(?:,chatStorageScope,publicChatNotices)?\} from "\.\/gmww-online-chat-policy\.js";/,'CHAT_IMPORT');
}
export function playerInteractionsScope(changes){
 if(!Array.isArray(changes)||!changes.length||changes.some(c=>!['A','M'].includes(c.status)))return null;
 if(changes.length===ciPaths.size&&changes.every(c=>ciPaths.has(c.path)))return 'player-interactions-ci';
 if(changes.length!==featurePaths.size||changes.some(c=>!featurePaths.has(c.path)))return null;
 const worker=changes.find(c=>c.path==='src/index.js');
 if(outsideChat(worker.before)===null||outsideChat(worker.before)!==outsideChat(worker.after))return null;
 return 'player-lobby-interactions';
}
