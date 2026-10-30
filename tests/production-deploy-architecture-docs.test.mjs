import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Extract and execute the actual deploy-scope shell guard, not a duplicate policy.
const workflow = readFileSync('.github/workflows/deploy-production.yml', 'utf8');
const startTag = '# BEGIN GMWW_ARCHITECTURE_DOCS_GUARD';
const endTag = '# END GMWW_ARCHITECTURE_DOCS_GUARD';
const start = workflow.indexOf(startTag);
const end = workflow.indexOf(endTag);
assert.ok(start >= 0 && end > start, 'docs-only deploy guard must exist');
assert.equal(workflow.indexOf(startTag, start + 1), -1, 'one guard only');
const snippet = workflow.slice(start, end + endTag.length);
const guardTestFile = 'tests/production-deploy-architecture-docs.test.mjs';
assert.ok(workflow.includes('|' + guardTestFile + ')'), 'the policy regression test itself must be CI-only');
const ciPolicy = readFileSync('.github/workflows/ci-policy-gate.yml', 'utf8');
assert.ok(ciPolicy.includes('node --test ' + guardTestFile), 'CI Policy Gate must run this regression test');

function runGuard(paths) {
  const dir = mkdtempSync(join(tmpdir(), 'gmww-architecture-scope-'));
  try {
    const listPath = join(dir, 'files.txt');
    const summaryPath = join(dir, 'summary.txt');
    writeFileSync(listPath, paths.join('\n') + (paths.length ? '\n' : ''));
    writeFileSync(summaryPath, '');
    const res = spawnSync('bash', ['-e', '-u', '-o', 'pipefail', '-c',
      'SHOULD_DEPLOY=true\n' + snippet + '\nprintf "%s" "$SHOULD_DEPLOY"\n'
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GMWW_PRODUCTION_CHANGED_PATH: listPath,
        GITHUB_STEP_SUMMARY: summaryPath,
      },
    });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    return res.stdout.trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('architecture documentation alone never triggers Production', () => {
  assert.equal(runGuard(['docs/architecture/github-first-dual-server-phase1-3.md']), 'false');
  assert.equal(runGuard([
    'docs/architecture/github-first-dual-server-phase1-3.md',
    'docs/architecture/github-first-ci-ota-inventory-20261030.md',
  ]), 'false');
});

test('a runtime source change mixed with docs still requires Production release gates', () => {
  assert.equal(runGuard(['docs/architecture/plan.md', 'src/index.js']), 'true');
  assert.equal(runGuard(['docs/architecture/plan.md', 'assets/village/index.html']), 'true');
});

test('unknown or nonarchitecture docs changes never gain a silent bypass', () => {
  assert.equal(runGuard(['docs/releases/other.md']), 'true');
  assert.equal(runGuard(['docs/architecture/not-markdown.txt']), 'true');
  assert.equal(runGuard(['tests/some-other.test.mjs']), 'true');
  assert.equal(runGuard([]), 'true');
});
