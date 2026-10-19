import '../characters/gmww40/runtime.js?v=c40-1';
import {mountCharacterRenderer as legacyMount,updateCharacterRenderer as legacyUpdate} from './character-renderer.mjs?v=ce5';
export {normalizeRendererCommand} from './character-renderer.mjs?v=ce5';
export function mountCharacterRenderer(host,options={}){return globalThis.GMWW_SHARED_MOTION.supports(options.characterId)?globalThis.GMWW_SHARED_MOTION.mount(host,options):legacyMount(host,options);}
export function updateCharacterRenderer(host,command){return globalThis.GMWW_SHARED_MOTION.update(host,command)||legacyUpdate(host,command);}
