// Single identity contract for the 40 active Character40 actors.
// Legacy member IDs 41/42 deliberately remain valid aliases (39/40) in the renderer.
// Never fold selected IDs 21–40 back into 01–20.
export const VILLAGE_CHARACTER_COUNT = 40;
export function resolveVillageCharacterId(rawId, fallbackSeed = '') {
  const id = String(rawId || '').trim();
  if (/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(id)) return id;
  const seed = String(fallbackSeed || '');
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 'character-' + String((hash % VILLAGE_CHARACTER_COUNT) + 1).padStart(2, '0');
}
