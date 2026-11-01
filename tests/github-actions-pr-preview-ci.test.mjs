import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {classifyBrowserScope, isPlayerFireWolf726Scope, PR726_WOLF_BLOB_CONTRACT} from '../.github/scripts/ci-browser-scope.mjs';

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
    M('tests/github-actions-pr-preview-ci.test.mjs'),
    M('.github/scripts/ci-browser-scope.mjs'),
    M('.github/workflows/check-player-web.yml')
  ];
  assert.equal(evaluate('ciOnly',ciOnly),true);
  const releaseOnly=[
    M('package.json'),M('package-lock.json'),M('src/index.js'),
    M('server-game/current/GMWW.html'),M('server-game/current/app.js'),
    M('server-game/src/00-core-and-library.part'),
    M('.github/scripts/prepare-update-channel.mjs'),
    M('tests/demo-runtime-v3285-release.test.mjs'),
    A('docs/releases/GMWW-RUNTIME-V3.286-MERGED-ONLY-20261101.md')
  ];
  assert.equal(evaluate('runtimeReleaseOnly',releaseOnly),true);
  assert.equal(evaluate('runtimeReleaseOnly',[...releaseOnly,M('src/player-web-src/30-rooms-and-realtime.part')]),false);
  assert.equal(evaluate('runtimeReleaseOnly',releaseOnly.map((x,i)=>i===0?D(x.path):x)),false);
  assert.equal(evaluate('runtimeReleaseOnly',releaseOnly.slice(0,8)),false);
  assert.ok(workflow.includes("needs.oracle-scope.outputs.runtime_release_only != 'true'"));
  assert.ok(workflow.includes('Verify no gameplay edits are hidden by V3.286 version bump'));
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

test('CI-LITE Preview selector uses focused checks only for exact four-file repair',()=>{
  const four=[
    '.github/workflows/check-pr-preview-github.yml',
    'tests/github-actions-pr-preview-ci.test.mjs',
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml'
  ];
  const entries=four.map(path=>({status:'M',path,before:'old CI',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(entries),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...entries,{status:'M',path:'src/index.js',before:'x',after:'y'}]),'full');
  assert.equal(classifyBrowserScope(entries.slice(0,3)),'full');
  assert.equal(classifyBrowserScope(entries.map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
  assert.equal(classifyBrowserScope([...entries,entries[0]]),'full');
  const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(worker,/steps\.scope\.outputs\.mode == 'ci-lite-preview-workflow'/);
  assert.match(worker,/node --test tests\/github-actions-pr-preview-ci\.test\.mjs/);
  assert.match(worker,/npm run check/);
});

test('V3.286 release selector rejects surprise gameplay changes and extra paths',()=>{
 const src=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
 const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
 assert.ok(src.includes('function isRuntimeMergedV3286Scope(changes)'));
 assert.ok(worker.includes("steps.scope.outputs.mode == 'runtime-merged-v3286'"));
 const expected=[
   'package.json','package-lock.json','src/index.js','server-game/current/GMWW.html',
   'server-game/current/app.js','server-game/src/00-core-and-library.part',
   '.github/scripts/prepare-update-channel.mjs','tests/demo-runtime-v3285-release.test.mjs'
 ];
 const changes=expected.map(path=>({path,status:'M',before:'SOURCE',after:'DIFFERENT'}));
 changes.push({path:'docs/releases/GMWW-RUNTIME-V3.286-MERGED-ONLY-20261101.md',status:'A',after:'Rollback'});
 assert.equal(classifyBrowserScope(changes),'full','Release must be rejected without exact source bytes');
 assert.equal(classifyBrowserScope([...changes,{path:'src/private.js',status:'M'}]),'full');
});

test('V3.286 main push CI parses real git newline and tab boundaries',()=>{
 const src=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
 const begin=src.indexOf("if(process.env.GMWW_CI_EVENT==='push')");
 assert.ok(begin>0,'main-push release selector must exist');
 const body=src.slice(begin,begin+700);
 assert.ok(body.includes(String.raw`trim().split('\n').filter(Boolean)`),'Must split actual LF');
 assert.ok(body.includes(String.raw`row.split('\t')`),'Must split actual TAB');
 assert.ok(!body.includes(String.raw`trim().split('\\n').filter(Boolean)`),'Escaped slash-n is invalid');
});

test('V3.286 main CI-only postmerge release routes to focused Worker gates with source integrity',()=>{
  const source=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
  const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.ok(source.includes("if(isCiLitePreviewWorkflowScope(changes) &&"));
  assert.ok(source.includes("'0c2c6ccf7cf9c90d2369ee269be2c89bb6996851','HEAD'"));
  assert.ok(source.includes("'src/','server-game/','assets/','package.json','package-lock.json','wrangler.jsonc'"));
  assert.ok(worker.includes("steps.scope.outputs.mode == 'ci-lite-preview-workflow' && github.event_name == 'push' && github.ref == 'refs/heads/main'"));
  assert.ok(workflow.includes('Postmerge CI-LITE V3.286 release recovery'));
});


test('dual Cloudflare synthetic-only PR is validated locally without allocating a Preview DO namespace',()=>{
  const match=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/);
  assert.ok(match);
  const statement=match[1].split('\n').find(l=>l.trim().startsWith('const standbyOnly = '));
  assert.ok(statement);
  const expr=statement.trim().slice('const standbyOnly = '.length).replace(/;$/,'');
  const A=path=>({status:'A',path}),M=path=>({status:'M',path});
  const scope=[
    A('infra/cloudflare-standby/fixture-contract.mjs'),
    A('infra/cloudflare-standby/fixture-contract.test.mjs'),
    A('docs/architecture/dual-cloudflare-standby-20261101.md'),
    A('tests/dual-cloudflare-release-guard.test.mjs'),
    M('tests/github-actions-pr-preview-ci.test.mjs'),
    M('tests/ci-browser-scope.test.mjs'),
    M('.github/scripts/ci-browser-scope.mjs'),
    M('.github/workflows/check-player-web.yml'),
    A('.github/workflows/check-cloudflare-standby.yml'),
    M('.github/workflows/deploy-production.yml'),
    M('.github/workflows/github-runtime-ota.yml'),
    M('.github/workflows/check-pr-preview-github.yml')
  ];
  const evaluate=changed=>vm.runInNewContext(expr,{changed});
  assert.equal(evaluate(scope),true);
  assert.equal(evaluate([...scope,M('src/index.js')]),false);
  assert.equal(evaluate([...scope,A('assets/new.png')]),false);
  assert.equal(evaluate(scope.slice(1)),false);
  assert.equal(evaluate([...scope,scope[0]]),false);
  assert.match(workflow,/needs\.oracle-scope\.outputs\.standby_only != 'true'/);
  assert.match(workflow,/appendFileSync\(process\.env\.GITHUB_OUTPUT,'standby_only='/);
});


test('exact synthetic session+WebSocket follow-up never allocates a Preview DO namespace',()=>{
  const match=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/);
  assert.ok(match,'scope classifier source is required');
  const statement=match[1].split('\n').find(l=>l.trim().startsWith('const standbyOnly = '));
  assert.ok(statement);
  const expr=statement.trim().slice('const standbyOnly = '.length).replace(/;$/,'');
  const modified=[
    'infra/cloudflare-standby/fixture-contract.mjs',
    'infra/cloudflare-standby/fixture-contract.test.mjs',
    '.github/scripts/ci-browser-scope.mjs',
    'tests/ci-browser-scope.test.mjs',
    '.github/workflows/check-pr-preview-github.yml',
    'tests/github-actions-pr-preview-ci.test.mjs'
  ].map(path=>({status:'M',path}));
  const evaluate=changed=>vm.runInNewContext(expr,{changed});
  assert.equal(evaluate(modified),true);
  assert.equal(evaluate([...modified,{status:'M',path:'src/index.js'}]),false);
  assert.equal(evaluate(modified.slice(1)),false);
  assert.equal(evaluate(modified.map((x,i)=>i===0?{...x,status:'D'}:x)),false);
  assert.equal(evaluate([...modified,modified[0]]),false);
  assert.ok(workflow.includes("needs.oracle-scope.outputs.standby_only != 'true'"));
});

// Recovery PR: test the exact nine PR726 blobs without deploying to Production or creating namespaces.
test('PR726 Worker CI-LITE accepts only unchanged 9 audited game files and keeps Preview required',()=>{
  const entries=PR726_WOLF_BLOB_CONTRACT.map(([path,status])=>({path,status}));
  const hashes=new Map(PR726_WOLF_BLOB_CONTRACT.map(([path,,sha])=>[path,sha]));
  const resolve=path=>hashes.get(path);
  assert.equal(isPlayerFireWolf726Scope(entries,resolve),true);
  assert.equal(isPlayerFireWolf726Scope(entries.slice(1),resolve),false);
  assert.equal(isPlayerFireWolf726Scope([...entries,entries[0]],resolve),false);
  assert.equal(isPlayerFireWolf726Scope([...entries,{path:'src/extra.js',status:'A'}],resolve),false);
  assert.equal(isPlayerFireWolf726Scope(entries.map((row,i)=>i===0?{...row,status:'D'}:row),resolve),false);
  assert.equal(isPlayerFireWolf726Scope(entries,path=>path===entries[0].path?'unexpected':resolve(path)),false);
  const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(worker,/steps\.scope\.outputs\.mode == 'player-fire-wolf-726'/);
  assert.match(worker,/tests\/player-web-wolf-ballots-20261101\.test\.mjs/);
  assert.match(worker,/tests\/night02-pack-snow-guard-fairy\.test\.mjs/);
  assert.match(worker,/npm run check/);
  assert.match(workflow,/code 10067/);
  assert.match(workflow,/wrangler preview --config wrangler\.jsonc/);
});

test('PR727 CI-only five-file merge suppresses Runtime release while preserving full CI fallback',()=>{
  const paths=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/check-pr-preview-github.yml',
    '.github/workflows/github-runtime-ota.yml',
    'tests/github-actions-pr-preview-ci.test.mjs'
  ];
  const entries=paths.map(path=>({path,status:'M',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(entries),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope(entries.filter(x=>x.path!=='.github/workflows/github-runtime-ota.yml')),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...entries,{path:'src/index.js',status:'M',after:'unsafe'}]),'full');
  assert.equal(classifyBrowserScope(entries.slice(1)),'full');
  assert.equal(classifyBrowserScope(entries.map(x=>x.path==='.github/workflows/github-runtime-ota.yml'?{...x,status:'D'}:x)),'full');
  assert.equal(classifyBrowserScope(entries.map(x=>x.path==='.github/workflows/github-runtime-ota.yml'?{...x,after:'unguarded'}:x)),'full');
  const runtime=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  const guard=runtime.match(/# PR727_CI_ONLY_GUARD:[\s\S]*?if \[ "\$CHANGED" = "\$PR727_ONLY" \]; then\s*SKIP_AUTO_RELEASE=true/);
  assert.ok(guard,'CI-only merge must have an exact-path Runtime auto-publish suppression');
  for(const path of paths)assert.ok(guard[0].includes("'"+path+"'"),'Runtime guard missing '+path);
  assert.match(runtime,/if: github\.event_name != 'pull_request' && needs\.package\.result == 'success' && needs\.package\.outputs\.skip_auto_release != 'true'/);
  const prod=readFileSync('.github/workflows/deploy-production.yml','utf8');
  for(const path of paths)assert.ok(prod.includes(path),'Production no-deploy allowlist missing '+path);
});

test('PR726 SHA trailing newline regression accepts Git hash-object output, never modified source',()=>{
  const entries=PR726_WOLF_BLOB_CONTRACT.map(([path,status])=>({path,status}));
  const hashes=new Map(PR726_WOLF_BLOB_CONTRACT.map(([path,,sha])=>[path,sha]));
  assert.equal(isPlayerFireWolf726Scope(entries,path=>hashes.get(path)+'\n'),true);
  assert.equal(isPlayerFireWolf726Scope(entries,path=>path===entries[0].path?'broken\n':hashes.get(path)+'\n'),false);
  assert.equal(isPlayerFireWolf726Scope([...entries,{path:'src/new-feature.js',status:'M'}],path=>hashes.get(path)+'\n'),false);
  const files=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/github-runtime-ota.yml',
    'tests/github-actions-pr-preview-ci.test.mjs'
  ];
  const changes=files.map(path=>({path,status:'M',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(changes),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M',after:'other'}]),'full');
  assert.equal(classifyBrowserScope(changes.map(x=>x.path===files[1]?{...x,status:'D'}:x)),'full');
  const runtime=readFileSync(files[1],'utf8');
  const guard=runtime.match(/# PR728_CI_ONLY_GUARD:[\s\S]*?if \[ "\$CHANGED" = "\$PR728_ONLY" \]; then\s*SKIP_AUTO_RELEASE=true/);
  assert.ok(guard,'Missing exact PR728 runtime release protection');
  for(const path of files)assert.ok(guard[0].includes("'"+path+"'"),'Guard missing '+path);
});


test('PR726 V3.288 postmerge CI recovery keeps exact source and release gates',()=>{
  const paths=['.github/scripts/ci-browser-scope.mjs','.github/workflows/github-runtime-ota.yml','tests/github-actions-pr-preview-ci.test.mjs'];
  const entries=paths.map(path=>({path,status:'M',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(entries),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...entries,{path:'src/index.js',status:'M',after:'unsafe'}]),'full');
  const selector=readFileSync(paths[0],'utf8');
  assert.match(selector,/PR726_V3288_MAIN_RECOVERY/);
  assert.match(selector,/isCiLitePreviewWorkflowScope\(changes\)/);
  assert.match(selector,/mode:'player-fire-wolf-726'/);
  assert.match(selector,/git\('diff','--quiet','4c7f1b5b6db8969e51410399fd094d568d8419ae'/);
  const runtime=readFileSync(paths[1],'utf8');
  assert.match(runtime,/PR728_CI_ONLY_GUARD/);
  assert.match(runtime,/SKIP_AUTO_RELEASE=true/);
});

test('PR731 V3.288 early Worker push CI routing remains isolated to exact three files',()=>{
  const paths=['.github/scripts/ci-browser-scope.mjs','.github/workflows/github-runtime-ota.yml','tests/github-actions-pr-preview-ci.test.mjs'];
  const entries=paths.map(path=>({path,status:'M',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(entries),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...entries,{path:'src/index.js',status:'M',after:'unreviewed'}]),'full');
  const selector=readFileSync(paths[0],'utf8');
  const position=selector.indexOf('PR731_V3288_PUSH_RECOVERY');
  const earlyLegacy=selector.indexOf('Main contains changes outside the verified scoped lists');
  assert.ok(position>=0&&position<earlyLegacy,'PR731 push check must run before legacy full fallback');
  assert.match(selector,/git\('diff','--quiet','e82ee014ed4929118b44294e9bfde5288a5cca44'/);
  assert.match(selector,/return \{mode:'player-fire-wolf-726'/);
  assert.match(readFileSync(paths[1],'utf8'),/PR731_CI_ONLY_GUARD/);
});

test('PR732 SHA isolated Worker main CI concurrency preserves exact fail-closed gates',()=>{
  const paths=['.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml','.github/workflows/check-pr-preview-github.yml','.github/workflows/github-runtime-ota.yml','tests/github-actions-pr-preview-ci.test.mjs'];
  const entries=paths.map(path=>({path,status:'M',after:readFileSync(path,'utf8')}));
  assert.equal(classifyBrowserScope(entries),'ci-lite-preview-workflow');
  assert.equal(classifyBrowserScope([...entries,{path:'src/index.js',status:'M',after:'unsafe'}]),'full');
  const selector=readFileSync(paths[0],'utf8'), worker=readFileSync(paths[1],'utf8');
  assert.ok(selector.indexOf('PR732_SHA_ISOLATED_MAIN')<selector.indexOf('Main contains changes outside the verified scoped lists'));
  assert.match(selector,/git\('diff','--quiet','083fd3d3896596e8a1d5d95a9a89fadfe988f41c'/);
  assert.match(worker,/group: player-web-check-v2-\$\{\{ github\.ref \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(worker,/cancel-in-progress: true/);
  assert.match(readFileSync(paths[2],'utf8'),/PR732_SHA_ISOLATED_MAIN/);
  assert.match(readFileSync(paths[3],'utf8'),/PR727_CI_ONLY_GUARD/);
});

test('GMWW V3 exact CI/policy PR keeps local checks but does not create a new Cloudflare DO namespace',()=>{
 const match=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/);
 assert.ok(match,'inline scope must remain visible');
 const statement=match[1].split('\n').find(l=>l.trim().startsWith('const v3PolicyOnly = '));
 assert.ok(statement,'V3 scope classifier missing');
 const expression=statement.trim().slice('const v3PolicyOnly = '.length).replace(/;$/,'');
 // The V3 expression spans multiple lines; evaluate from its declaration up to the semicolon.
 const start=match[1].indexOf('const v3PolicyOnly = ');
 const end=match[1].indexOf(';',start);
 const expr=match[1].slice(start+'const v3PolicyOnly = '.length,end);
 const changes=[
  {status:'M',path:'AGENTS.md'},
  {status:'A',path:'.github/scripts/v3-delivery-plan.mjs'},
  {status:'A',path:'tests/v3-delivery-plan.test.mjs'},
  {status:'A',path:'docs/architecture/GMWW-AUTO-DELIVERY-V3.0.md'},
  {status:'A',path:'.github/workflows/gmww-auto-delivery-v3.yml'},
  {status:'M',path:'.github/workflows/ci-policy-gate.yml'},
  {status:'M',path:'.github/workflows/check-player-web.yml'},
  {status:'M',path:'.github/workflows/deploy-production.yml'},
  {status:'M',path:'.github/workflows/github-runtime-ota.yml'},
  {status:'M',path:'.github/workflows/check-pr-preview-github.yml'},
  {status:'M',path:'tests/github-actions-pr-preview-ci.test.mjs'}
 ];
 const evaluate=items=>vm.runInNewContext(expr,{changed:items});
 assert.equal(evaluate(changes),true);
 assert.equal(evaluate(changes.slice(1)),false);
 assert.equal(evaluate([...changes,changes[0]]),false);
 assert.equal(evaluate([...changes,{status:'M',path:'src/index.js'}]),false);
 assert.equal(evaluate(changes.map((x,i)=>i===0?{...x,status:'D'}:x)),false);
 assert.match(workflow,/needs.oracle-scope.outputs.v3_policy_only != 'true'/);
 assert.match(workflow,/appendFileSync\(process.env.GITHUB_OUTPUT,'v3_policy_only='/);
 assert.match(workflow,/Build Worker locally, without publishing or Cloudflare build minutes/);
});
