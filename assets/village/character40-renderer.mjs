import '../characters/gmww40/runtime.js?v=c40-1';
export function normalizeRendererCommand(command={},fallback='character-01'){
 const api=globalThis.GMWW_SHARED_MOTION,characterId=api.supports(command.characterId)?command.characterId:fallback;
 const motion=command.motion==='turn'?'turn':command.state==='walking'?'walk':command.state==='running'?'run':'idle';
 return {characterId,rigId:String(command.rigId||'rig-male-normal-v1'),motion,state:motion==='walk'?'walking':motion==='run'?'running':'idle',facing:command.facing==='left'?'left':'right',loop:command.loop!==false,engineVersion:String(command.engineVersion||''),activity:motion,paused:command.paused===true||command.state==='dead'};
}
export function mountCharacterRenderer(host,options={}){return globalThis.GMWW_SHARED_MOTION.supports(options.characterId)?globalThis.GMWW_SHARED_MOTION.mount(host,options):null;}
export function updateCharacterRenderer(host,command){return globalThis.GMWW_SHARED_MOTION.update(host,command);}
