import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');

test('Server member picker uses 42 game characters instead of artwork thumbnails',()=>{
  assert.match(app,/MEMBER_CHARACTER_COUNT=42/);
  assert.match(app,/🎭 Bộ 42 Nhân Vật/);
  assert.match(app,/\/api\/game-characters\?gm=/);
  assert.doesNotMatch(app,/Đồng bộ Artwork/);
  assert.doesNotMatch(app,/syncArtworkAvatars\(\)/);
  assert.match(app,/gameCharacterId=memberAdminState\.selectedAvatarId/);
  assert.match(app,/JSON\.stringify\(\{loginId,displayName,avatarId,gameCharacterId\}\)/);
});

test('GM member character identity is stored and served directly',()=>{
  assert.match(worker,/if\(normalizeGameCharacterId\(id\)\)return true/);
  assert.match(worker,/if\(normalizeGameCharacterId\(id\)\)return gameCharacterImage\(env,id,request\)/);
  assert.match(worker,/function activeGameCharacterId\(v,seed=""\)\{const id=normalizeGameCharacterId\(v\);if\(id\)return id/);
  assert.match(worker,/\/characters\/v253\/chibi-/);
});
