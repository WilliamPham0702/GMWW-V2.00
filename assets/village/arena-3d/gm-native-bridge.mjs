// Core GM to Arena 3D bridge. No credential is stored, logged or put into URL.
// Source must be the immediate host frame (GMWW iOS WKWebView / official web).
// This checks message shape ONLY; the server is the ultimate authenticator.
export const ARENA_GM_NATIVE_BRIDGE_VERSION='gmww.arena.native-context.1';
const ROOM=/^[A-Z0-9]{4,12}$/,TOKEN=/^[A-Za-z0-9._~+\/=:-]{12,256}$/;
export function validateArenaGmContext(message,{origin='',expectedOrigin='',
 sourceIsParent=false,hasParentFrame=false}={}){
 if(!sourceIsParent||!hasParentFrame)return null;
 // Local packaged IPA/file: origins are opaque "null"; HTTPS official GMWW
 // page may also host this same-origin frame. Reject all other websites.
 if(origin!=='null'&&origin!==expectedOrigin)return null;
 if(!message||message.kind!=='gmww-arena3d-gm-context'||
   typeof message.roomCode!=='string'||typeof message.gmToken!=='string')return null;
 const roomCode=message.roomCode.trim().toUpperCase(),gmToken=message.gmToken;
 if(!ROOM.test(roomCode)||!TOKEN.test(gmToken))return null;
 return Object.freeze({roomCode,gmToken});
}
export function arenaGmContextPayload(roomCode,gmToken){
 if(typeof roomCode!=='string'||typeof gmToken!=='string')return null;
 const validated=validateArenaGmContext({kind:'gmww-arena3d-gm-context',roomCode,gmToken},
   {origin:'null',sourceIsParent:true,hasParentFrame:true});
 return validated?Object.freeze({kind:'gmww-arena3d-gm-context',...validated}):null;
}
