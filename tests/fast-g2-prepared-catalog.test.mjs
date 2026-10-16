import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {selectBuildVerifiedManifest} from '../src/gmww-release-catalog-policy.js';

test('real package producer emits a verified catalog for a future Runtime without version-specific code',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gmww-package-'));
  const put=(name,bytes)=>{const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes)};
  try{
    put('server-game/current/app.js',"const VERSION='3.999';");
    put('server-game/current/GMWW.html','<title>GMWW V3.999</title><script src="app.js"></script>');
    for(const file of ['style.css','character-renderer.js','character-renderer.css'])put('server-game/current/'+file,'test fixture '+file);
    for(const file of ['home-fantasy-hero-v337.webp','home-v1-book.webp','home-v1-members.webp','home-v1-action.webp'])put('server-game/current/home-art/'+file,'test image bytes');
    put('assets/gm/gm-white-wolf.webp','test wolf bytes');
    put('server-game/shared/artwork.js','// isolated fixture');
    put('src/index.js','const NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="future";');
    put('server-game/GMWW-Server.xcodeproj/project.pbxproj','MARKETING_VERSION = 3.110;');
    const roles={};
    for(let i=0;i<63;i++){const id='fixture-role-'+i;roles[id]={};put('server-game/legacy-assets/v252/assets/role-artwork-v251/original/'+id+'.webp','test role '+i)}
    put('server-game/legacy-assets/v252/role-artwork-v251.js','window.GMWW_BUILTIN_ROLE_ARTWORK='+JSON.stringify(roles));
    const result=spawnSync(process.execPath,[path.resolve('.github/scripts/prepare-update-channel.mjs'),'server_only'],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const module=fs.readFileSync(path.join(root,'src/gmww-release-catalog.js'),'utf8');
    const {releaseCatalog}=await import('data:text/javascript;base64,'+Buffer.from(module).toString('base64'));
    const manifest=await selectBuildVerifiedManifest(releaseCatalog,'3.999','3.110');
    assert.equal(manifest.releaseType,'runtime');
    assert.equal(manifest.runtime.files.filter(f=>f.path.startsWith('assets/role-artwork-v251/original/')).length,63);
    for(const file of manifest.runtime.files){
      const bytes=fs.readFileSync(path.join(root,'assets/updates/runtime/V3.999',file.path));
      assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
    }
    put('server-game/current/app.js',"const VERSION='3.1000';");
    put('server-game/current/GMWW.html','<title>GMWW V3.1000</title><script src="app.js"></script>');
    const next=spawnSync(process.execPath,[path.resolve('.github/scripts/prepare-update-channel.mjs'),'runtime'],{cwd:root,encoding:'utf8'});
    assert.equal(next.status,0,next.stderr);
    const baseModule=fs.readFileSync(path.join(root,'src/gmww-release-bases.js'),'utf8');
    const {releaseBases}=await import('data:text/javascript;base64,'+Buffer.from(baseModule).toString('base64'));
    assert.equal(releaseBases.length,1);
    assert.equal(releaseBases[0].manifest.releaseVersion,'3.999');
    assert.ok(await selectBuildVerifiedManifest(releaseBases[0],'3.999','3.110'));
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
