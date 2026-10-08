import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('GMWW release guard accepts current Production and blocks version rollback',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const runtime=String(pkg.version).replace(/\.0$/,'');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gmww-version-guard-'));
  const fixture=path.join(dir,'health.json');
  const run=v=>{
    fs.writeFileSync(fixture,JSON.stringify({project:'GMWW-V2.00',status:'online',version:'V'+v}));
    return spawnSync(process.execPath,['.github/scripts/verify-gmww-versions.mjs',fixture],{encoding:'utf8'});
  };
  try{
    assert.equal(run(runtime).status,0);
    const [major,minor]=runtime.split('.').map(Number);
    const downgrade=run(major+'.'+(minor+1));
    assert.notEqual(downgrade.status,0);
    assert.match(downgrade.stderr,/ROLLBACK BLOCKED/);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
