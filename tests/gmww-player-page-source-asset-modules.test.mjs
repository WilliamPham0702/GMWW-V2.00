import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const parts=[
  'src/player-page-src/00-head-and-style.part',
  'src/player-page-src/10-body-and-roles.part',
  'src/player-page-src/20-inline-scripts-and-export.part'
];
const files=['image-0.data','image-1.data','image-2.data','image-3.data',
  'image-2.data','image-5.data','image-6.data'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const rebuild=()=>{
  let script=parts.map(p=>readFileSync(p,'utf8')).join('');
  for(const [i,filename] of files.entries()){
    const token='__GMWW_EMBED_IMAGE_'+i+'__';
    assert.equal(script.split(token).length,2,'Missing or duplicated token '+token);
    const data=readFileSync('src/player-page-src/embedded/'+filename,'utf8');
    assert.match(data,/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/);
    script=script.replace(token,data);
  }
  return script;
};

test('G3.10: editable Player page modules reconstruct the exact 1.5 MB shipping file',()=>{
  const original=readFileSync('src/gmww-members-page.js','utf8');
  const output=rebuild();
  assert.equal(hash(output),hash(original),'Generated Player HTML module changed');
  assert.equal(output,original,'HTML/CSS/inline JS and embedded artwork must match every byte');
  assert.equal((output.match(/data:image\/(?:png|webp);base64,/g)||[]).length,7);
});

test('G3.10: retired V1 room preview references are absent; original media files remain preserved',()=>{
  const paths=new Set(files);
  assert.equal(paths.size,6,'Preserve all six original media payload files');
  const body=parts.map(p=>readFileSync(p,'utf8')).join('');
  for(const index of [0,1,2,6]){
    assert.ok(body.includes('__GMWW_EMBED_IMAGE_'+index+'__'),'Retain active artwork marker '+index);
  }
  for(const index of [3,4,5]){
    assert.ok(!body.includes('__GMWW_EMBED_IMAGE_'+index+'__'),'Retired V1-only marker '+index+' must not render');
  }
  assert.ok(!body.includes('<section id="rooms"'),'Retired V1 room picker must not return');
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
