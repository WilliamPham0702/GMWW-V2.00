import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const production=readFileSync('.github/workflows/deploy-production.yml','utf8');
const ota=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
function extract(s,start,end) {
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Missing standby scope markers');
  assert.equal(s.indexOf(start,a+1),-1,'Duplicate standby scope marker');
  return s.slice(a,b+end.length);
}
const prod=extract(production,'# BEGIN GMWW_DUAL_CLOUDFLARE_STAGING_GUARD','# END GMWW_DUAL_CLOUDFLARE_STAGING_GUARD');
const runtime=extract(ota,'# BEGIN GMWW_DUAL_CLOUDFLARE_RUNTIME_GUARD','# END GMWW_DUAL_CLOUDFLARE_RUNTIME_GUARD');
function check(paths,kind) {
  const dir=mkdtempSync(join(tmpdir(),'gmww-dual-cf-'));
  try {
    const changes=join(dir,'changed.txt'),summary=join(dir,'summary.txt');
    writeFileSync(changes,paths.join('\n')+'\n');writeFileSync(summary,'');
    const code=kind==='production'?'SHOULD_DEPLOY=true\n'+prod.replaceAll('/tmp/gmww-production-change-scope.txt',changes)+'\nprintf "%s" "$SHOULD_DEPLOY"':'SKIP_AUTO_RELEASE=false\nCHANGED=$(cat "'+changes+'")\n'+runtime+'\nprintf "%s" "$SKIP_AUTO_RELEASE"';
    const r=spawnSync('bash',['-e','-u','-o','pipefail','-c',code],{encoding:'utf8',env:{...process.env,GITHUB_STEP_SUMMARY:summary}});
    assert.equal(r.status,0,r.stderr||r.stdout);
    return r.stdout.trim();
  }finally{rmSync(dir,{recursive:true,force:true})}
}
const fixture=['infra/cloudflare-standby/fixture-contract.mjs','infra/cloudflare-standby/fixture-contract.test.mjs','docs/architecture/dual-cloudflare-standby-20261101.md','.github/workflows/check-cloudflare-standby.yml','.github/workflows/deploy-production.yml','.github/workflows/github-runtime-ota.yml','.github/workflows/check-pr-preview-github.yml','tests/dual-cloudflare-release-guard.test.mjs','tests/github-actions-pr-preview-ci.test.mjs'];
test('scoped synthetic standby change skips Production and Runtime auto release',()=>{
  assert.equal(check(fixture,'production'),'false');
  assert.equal(check(fixture,'runtime'),'true');
});
test('any production gameplay or manifest change bypasses standby skip',()=>{
  for(const x of ['src/index.js','wrangler.jsonc','assets/index.html','server-game/current/app.js','package.json']){
    assert.equal(check([...fixture,x],'production'),'true');
    assert.equal(check([...fixture,x],'runtime'),'false');
  }
});
test('unknown arbitrary file does not qualify for standby skip',()=>{
  assert.equal(check([...fixture,'docs/releases/random.md'],'production'),'true');
  assert.equal(check([...fixture,'docs/releases/random.md'],'runtime'),'false');
});
test('workflow-only changes without fixture tests do not qualify',()=>{
  assert.equal(check(['.github/workflows/deploy-production.yml','.github/workflows/github-runtime-ota.yml'],'production'),'true');
  assert.equal(check(['.github/workflows/deploy-production.yml','.github/workflows/github-runtime-ota.yml'],'runtime'),'false');
});
