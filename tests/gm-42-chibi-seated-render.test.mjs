import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('server-game/current/app.js');
const lines = source.split(/\r?\n/);
const nameList = ['playActiveCharacterId', 'playCharacterFrameUrl', 'playCharacterSitting', 'playCharacterVisualUrl'];
const definitions = nameList.map(name => {
  const line = lines.find(value => value.startsWith('function ' + name + '('));
  assert.ok(line, name + ' must remain testable');
  return line;
});
const seatedArtwork = Object.fromEntries(
  Array.from({length: 4}, (_, i) => ['character-' + String(i + 1).padStart(2, '0'), 'seated-artwork-' + (i + 1)])
);
const { visual } = vm.runInNewContext(
  definitions.join('\n') + '\n({visual: playCharacterVisualUrl})',
  { GMWW_SERVER_BASE: 'https://mock.gmww.test', PLAY_SEATED_CHARACTER_URLS: seatedArtwork, playNow: () => 0 }
);

test('GM renders a nonempty image for all 42 selected chibi when seated/offline', () => {
  for (let i = 1; i <= 42; i++) {
    const id = 'character-' + String(i).padStart(2, '0');
    const image = visual({gameCharacterId: id, seatId: i, online: false}, 1, 'right', 0);
    assert.equal(typeof image, 'string', 'missing seated image for ' + id);
    assert.ok(image.length > 0, 'empty seated image for ' + id);
    assert.doesNotMatch(image, /undefined|null|^\s*$/i, id);
    assert.equal(image,'https://mock.gmww.test/api/game-characters/'+id+'/image?rev=c40-1');
  }
});

test('GM selects a valid walk/idle picture for all 42 chibi without a seat', () => {
  for (let i = 1; i <= 42; i++) {
    const id = 'character-' + String(i).padStart(2, '0');
    const pic = visual({gameCharacterId:id,seatId:null,online:false}, 1, 'left', 0);
    assert.equal(typeof pic,'string', id);
    assert.ok(pic.length > 0, id);
    assert.doesNotMatch(pic, /undefined|null/i, id);
    assert.equal(pic,'https://mock.gmww.test/api/game-characters/'+id+'/image?rev=c40-1');
  }
});

test('all 42 image asset IDs and first 20 movement frames exist in the packaged repository', () => {
  for (let i = 1; i <= 42; i++) {
    const n = String(i).padStart(2, '0'), id = 'character-' + n;
    assert.ok(fs.existsSync(new URL('../assets/characters/v253/chibi-' + n + '.webp', import.meta.url)), id + ' static fallback');
    if (i <= 20) {
      assert.ok(fs.existsSync(new URL('../assets/characters/walk-v263/' + id + '/frame-01.webp', import.meta.url)), id + ' right frame');
      assert.ok(fs.existsSync(new URL('../assets/characters/walk-v266-left/' + id + '/frame-01.webp', import.meta.url)), id + ' left frame');
    }
  }
});
