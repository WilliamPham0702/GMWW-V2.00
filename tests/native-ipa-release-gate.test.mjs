import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>fs.readFileSync(path,'utf8');
const build=read('.github/workflows/build-server-game-ipa.yml');
const channel=read('.github/scripts/prepare-update-channel.mjs');
const deploy=read('.github/workflows/deploy-production.yml');

function classify(changedFiles){
  const r=spawnSync(process.execPath,['.github/scripts/classify-update.mjs'],{
    env:{...process.env,GMWW_CHANGED_FILES:changedFiles.join('\n')},encoding:'utf8'
  });
  assert.equal(r.status,0,r.stderr);
  return JSON.parse(r.stdout).releaseType;
}

test('Swift/Xcode edits classify native; plain web changes classify runtime',()=>{
  assert.equal(classify(['server-game/GMWW-Server/GameView.swift','server-game/current/app.js']),'native');
  assert.equal(classify(['server-game/current/app.js']),'runtime');
  assert.equal(classify(['tests/native-ipa-release-gate.test.mjs']),'server_only');
});

test('V3.204 supports an older shell without falsely announcing an IPA release',()=>{
  assert.match(channel,/if\(version!==shell&&\(releaseType==='server_only'\|\|releaseType==='native'\)\) releaseType='runtime'/);
  assert.match(channel,/shellVersion:shell/);
  assert.match(channel,/releaseNotes:\["V3\.204:/);
  assert.match(channel,/sha256:sha\(/);
});

test('macOS native workflow installs dependencies before testing and builds a PR artifact',()=>{
  const install=build.indexOf('run: npm ci');
  const tests=build.indexOf('          npm test');
  assert.ok(install>=0&&tests>install);
  assert.match(build,/pull_request:[\s\S]*?branches: \[main\]/);
  assert.match(build,/actions\/upload-artifact@v4/);
  assert.match(build,/CODE_SIGNING_ALLOWED=NO/);
});

test('Unapproved PR cannot publish an official IPA or deploy Production',()=>{
  assert.match(build,/name: Publish IPA for in-app download\s+if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(deploy,/github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(deploy,/github\.event\.workflow_run\.conclusion == 'success'/);
});
