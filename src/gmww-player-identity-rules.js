// GMWW FAST G3.6 — legacy member and game-character identity rules.
// These are the unchanged, authoritative Worker implementations.
export const GAME_CHARACTER_COUNT=40;
export function normalizeGameCharacterId(v){const id=String(v||"").trim();return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(id)?id:""}
export function activeGameCharacterId(v,seed=""){const id=normalizeGameCharacterId(v);if(id)return id;const text=String(seed||"");let h=0;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))>>>0;return"character-"+String((h%20)+1).padStart(2,"0")}
const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200];
export function normalizeCharacterScale(v,fallback=100){const n=Number(v);if(!Number.isFinite(n))return fallback;return CHARACTER_SCALE_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALE_OPTIONS[0])}

export function normalizeLoginId(v){return String(v||"").trim().toLowerCase()}
