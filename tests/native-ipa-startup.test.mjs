import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
test('native build includes all local startup scripts and styles from current runtime',()=>{
  const refs=[...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:[?#][^"]*)?"/g)].map(m=>m[1]);
  for(const file of refs){
    if(file==='village-layout.js')continue;
    assert.ok(workflow.includes('cp server-game/current/'+file+' "$APPDIR/Web/'+file+'"'),'Native IPA misses '+file);
  }
});
test('native build ships Character40 and verifies output startup dependencies',()=>{
  assert.ok(workflow.includes('cp -R assets/characters/gmww40/. "$APPDIR/Web/characters/gmww40/"'));
  assert.ok(workflow.includes('node .github/scripts/verify-native-web.mjs "$APP/Web"'));
});
