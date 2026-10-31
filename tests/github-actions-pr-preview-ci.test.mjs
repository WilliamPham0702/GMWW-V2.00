import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const workflow = readFileSync('.github/workflows/check-pr-preview-github.yml','utf8');

test('PR Preview is triggered by pull_request only, not a Production push',()=>{
  assert.match(workflow,/^on:\s*\n  pull_request:/m);
  assert.doesNotMatch(workflow,/^  (push|workflow_run|schedule|workflow_dispatch):/m);
  assert.match(workflow,/persist-credentials: false/);
  assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow,/github\.event\.pull_request\.user\.login == github\.repository_owner/);
});

test('GitHub Actions validates before publish and uses Wrangler Preview only',()=>{
  assert.ok(workflow.includes('needs: validate-preview') || workflow.includes('needs: [validate-preview, oracle-scope]'));
  assert.match(workflow,/oracle-scope.outputs.oracle_only != 'true'/);
  assert.match(workflow,/npm run check/);
  assert.match(workflow,/node \.github\/scripts\/guard-pr-preview-ci\.mjs/);
  assert.match(workflow,/wrangler preview --config wrangler\.jsonc/);
  assert.match(workflow,/--worker-name gmww-v2-00 --name "pr-/);
  assert.doesNotMatch(workflow,/^\s*npx.*wrangler deploy(?!\s+--dry-run)/m);
  assert.doesNotMatch(workflow,/^\s*(?:curl|wget).*deploy_hooks/m);
});

test('GMWW Preview Durable Objects and data stay isolated',()=>{
  const result=spawnSync(process.execPath,['.github/scripts/guard-pr-preview-ci.mjs'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/isolated ROOMS DO/);
});

test('CI-only Preview changes cannot invoke Production auto-deploy or IPA packaging',()=>{
  const scope=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
  const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
  const ipa=readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
  const production=readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(scope,/isGithubPreviewCIOnly\(changes\)/);
  assert.match(worker,/steps\.scope\.outputs\.mode == 'github-pr-preview-ci'/);
  assert.match(ipa,/needs\.scope\.outputs\.mode != 'github-pr-preview-ci'/);
  for (const file of ['.github/workflows/check-pr-preview-github.yml',
    '.github/scripts/guard-pr-preview-ci.mjs',
    'tests/github-actions-pr-preview-ci.test.mjs',
    '.github/workflows/build-server-game-ipa.yml',
    '.github/workflows/check-dual-renderer.yml']) {
    assert.ok(production.includes(file),'Production scope must ignore '+file);
  }
});

test('CI-LITE docs-only and Preview-CI-only selectors fail closed without dropping required gate',()=>{
  const scope=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/);
  assert.ok(scope,'scope classifier must remain testable');
  function evaluate(variable,changed){
    const line=scope[1].split('\n').find(l=>l.trim().startsWith('const '+variable+' = '));
    assert.ok(line,variable+' must be declared');
    const expression=line.trim().slice(('const '+variable+' = ').length).replace(/;$/,'');
    return vm.runInNewContext(expression,{changed});
  }
  const A=path=>({status:'A',path}),M=path=>({status:'M',path}),D=path=>({status:'D',path});
  assert.equal(evaluate('docsOnly',[A('docs/GMWW-FAST-TRACK-V1.md')]),true);
  assert.equal(evaluate('docsOnly',[A('docs/ci-lite-a-audit-20261031.md')]),true);
  for(const changes of [
    [],[A('docs/guide.md'),M('src/index.js')],[D('docs/guide.md')],
    [A('docs/../.github/workflows/check-pr-preview-github.yml')],
    [A('.github/workflows/check-pr-preview-github.yml')],
    [A('docs/guide.mjs')],[A('docs/guide.md'),D('docs/old.md')]
  ])assert.equal(evaluate('docsOnly',changes),false,JSON.stringify(changes));
  const ciOnly=[
    M('.github/workflows/check-pr-preview-github.yml'),
    M('tests/github-actions-pr-preview-ci.test.mjs')
  ];
  assert.equal(evaluate('ciOnly',ciOnly),true);
  assert.equal(evaluate('ciOnly',[...ciOnly,M('src/index.js')]),false);
  assert.equal(evaluate('ciOnly',[D(ciOnly[0].path),ciOnly[1]]),false);
  assert.equal(evaluate('ciOnly',[ciOnly[0],ciOnly[0]]),false);
  assert.match(workflow,/needs\.oracle-scope\.outputs\.docs_only != 'true' && needs\.oracle-scope\.outputs\.preview_ci_only != 'true'/);
  assert.match(workflow,/if: needs\.oracle-scope\.outputs\.docs_only == 'true'/);
  assert.match(workflow,/if: needs\.oracle-scope\.outputs\.docs_only != 'true'/);
  assert.match(workflow,/git diff --check "\$BASE" "\$HEAD"/);
  assert.match(workflow,/npm run check/);
  assert.match(workflow,/name: Validate isolated Preview without Cloudflare Builds/);
  assert.match(workflow,/name: Publish isolated Worker Preview \(never Production\)/);
});
