import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const paths=[
  'src/player-web-src/00-bootstrap-and-session.part',
  'src/player-web-src/10-role-card-artwork.part',
  'src/player-web-src/20-village-and-profile.part',
  'src/player-web-src/30-rooms-and-realtime.part',
  'src/player-web-src/35-online-chat.part',
  'src/player-web-src/40-cards-and-game.part',
  'src/player-web-src/50-privacy-and-runtime.part'
];
const hash=x=>createHash('sha256').update(x).digest('hex');
const compiled=()=>readFileSync('src/gmww-members-live.js','utf8');
const script=()=>JSON.parse(compiled().slice('export const gmwwMembersLiveScript = '.length).trim().replace(/;$/,''));

test('G3.9: source parts assemble the EXACT deployed Player Web JavaScript',()=>{
  const pieces=paths.map(p=>readFileSync(p,'utf8'));
  assert.equal(pieces.length,7);
  for(const [i,part] of pieces.entries())assert.ok(part.length>1000,'Missing source part '+i);
  const body=pieces.join('');
  assert.equal(body,script(),'Decoded Player Web source must be unchanged');
  const emitted='export const gmwwMembersLiveScript = '+JSON.stringify(body)+';\n';
  assert.equal(hash(Buffer.from(emitted)),hash(Buffer.from(compiled())));
  assert.equal(emitted,compiled(),'No bytes may change in the Worker delivered script');
});

test('G3.9: original role-card artwork stays byte-for-byte in dedicated asset source',()=>{
  const back=readFileSync(paths[1],'utf8');
  assert.match(back,/function applyRoleCardBack\(/);
  assert.match(back,/data:image\/webp;base64,/);
  assert.doesNotMatch(back,/function openVillageProfile\(/,'Artwork part must end before Lobby/Room code');
});

test('G3.9: Player Web source assembler is deterministic and CI-gated',()=>{
  const result=spawnSync(process.execPath,['.github/scripts/assemble-player-web.mjs','--verify'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/Player Web source matches packaged script/);
  const ci=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(ci,/"src\/\*\*"/);
  assert.match(ci,/npm test/);
});

test('G3.9: compiled script retains critical workflow and safe session restoration',()=>{
  const source=script();
  for(const fn of ['function restoreCachedRole(','function ensurePlayerTopMenu(',
    'function connectWS(','function renderRole(','function applyRoleCardBack('])
    assert.ok(source.includes(fn),fn);
  assert.match(source,/GMWW_CHARACTER_SCALES=\[75,100,125,150,175,200\]/);
});
