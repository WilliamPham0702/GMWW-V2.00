import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const workflow = readFileSync('.github/workflows/check-pr-preview-github.yml','utf8');

test('PR Preview is triggered by pull_request only, not a Production push',()=>{
  assert.match(workflow,/^on:\s*\n  pull_request:/m);
  assert.doesNotMatch(workflow,/^  (push|workflow_run|schedule|workflow_dispatch):/m);
  assert.match(workflow,/persist-credentials: false/);
  assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow,/github\.event\.pull_request\.user\.login == github\.repository_owner/);
});

test('GitHub Actions validates before publish and uses Wrangler Preview only',()=>{
  assert.match(workflow,/needs: validate-preview/);
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
