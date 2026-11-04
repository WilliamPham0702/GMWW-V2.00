import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const parts=[
  'src/player-page-src/00-head-and-style.part',
  'src/player-page-src/10-body-and-roles.part',
  'src/player-page-src/20-inline-scripts-and-export.part'
];
const files=JSON.parse(readFileSync('src/player-page-src/embedded/manifest.json','utf8')).images;
const hash=s=>createHash('sha256').update(s).digest('hex');
const rebuild=()=>{
  let script=parts.map(p=>readFileSync(p,'utf8')).join('');
  for(const [i,filename] of files.entries()){
    const token='__GMWW_EMBED_IMAGE_'+i+'__';
    assert.equal(script.split(token).length,2,'Missing or duplicated token '+token);
    const data=readFileSync('src/player-page-src/embedded/'+filename,'utf8');
    assert.match(data,/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/);
    script=script.replace(token,data);
  }
  return script;
};

test('G3.10: editable Player page modules reconstruct the exact shipping file',()=>{
  const original=readFileSync('src/gmww-members-page.js','utf8');
  const output=rebuild();
  assert.equal(hash(output),hash(original),'Generated Player HTML module changed');
  assert.equal(output,original,'HTML/CSS/inline JS and embedded artwork must match every byte');
  assert.equal((output.match(/data:image\/(?:png|webp|jpeg);base64,/g)||[]).length,files.length);
});

test('G3.10: every embedded artwork file is referenced and stored once',()=>{
  const stored=readdirSync('src/player-page-src/embedded').filter(f=>f.endsWith('.data')).sort();
  assert.deepEqual([...new Set(files)].sort(),stored,'Unreferenced or missing embedded artwork');
  const payloads=stored.map(f=>readFileSync('src/player-page-src/embedded/'+f,'utf8'));
  assert.equal(new Set(payloads).size,payloads.length,'Duplicate artwork must be stored once');
  const body=parts.map(p=>readFileSync(p,'utf8')).join('');
  assert.ok(body.includes('<body'));
  assert.ok(body.includes('export function gmwwMembersPage('));
});

test('G3.10: assembler verifies byte equality, source edits are CI-gated',()=>{
  const p=spawnSync(process.execPath,['.github/scripts/assemble-player-page.mjs','--verify'],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr||p.stdout);
  assert.match(p.stdout,/Player page source matches packaged module/);
  const ci=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(ci,/"src\/\*\*"/);
  assert.match(ci,/npm test/);
});

test('G3.10: delivered Player HTML stays valid ES module after extraction',()=>{
  const p=spawnSync(process.execPath,['--check','src/gmww-members-page.js'],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);
});
