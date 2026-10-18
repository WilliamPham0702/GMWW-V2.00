import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('production deployment remains gated by successful main CI and checked-out history', () => {
  const workflow = read('.github/workflows/deploy-production.yml');
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\["Check Player Web Worker"\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /fetch-depth:\s*2/); // git diff-tree needs the merge parents.
  assert.match(workflow, /git diff-tree --no-commit-id --name-only -r -m/);
  assert.match(workflow, /verify-ota-version-advance\.mjs/);
  assert.match(workflow, /sha256/);
});

test('the IPA release and native shell snapshot retain their safety boundaries', () => {
  const native = read('.github/workflows/build-server-game-ipa.yml');
  const snapshot = read('.github/workflows/build-runtime-snapshot-ipa.yml');
  assert.match(native, /runs-on:\s*macos-latest/);
  assert.match(native, /server-game\/GMWW-Server\.xcodeproj\/\*\*/);
  assert.match(native, /gh release create/);
  assert.match(snapshot, /runs-on:\s*macos-latest/);
  assert.match(snapshot, /server-game\/SNAPSHOT_IPA_REQUEST/);
  assert.match(snapshot, /shasum -a 256/);
  assert.match(snapshot, /official_release=false/);
});

test('OTA manifest and historical checkout safeguards remain enabled', () => {
  const channel = read('.github/scripts/prepare-update-channel.mjs');
  const version = read('.github/scripts/verify-ota-version-advance.mjs');
  const bootstrap = read('.github/workflows/bootstrap-v263-walk-frames.yml');
  assert.match(channel, /createHash\('sha256'\)/);
  assert.match(channel, /sha256:/);
  assert.match(version, /Invalid Runtime asset URL|Runtime asset URL does not match release path/);
  assert.match(version, /Missing or invalid SHA-256/);
  assert.match(bootstrap, /fetch-depth:\s*0/); // This workflow needs full history.
});

test('cache-only CI changes cannot accidentally deploy or release an IPA', () => {
  for (const path of [
    '.github/workflows/check-player-card-browsers.yml',
    '.github/workflows/check-character-engine.yml',
    '.github/workflows/check-30-player-realtime.yml',
    '.github/workflows/check-character-v4-redesign.yml'
  ]) {
    const workflow = read(path);
    assert.doesNotMatch(workflow, /\bwrangler deploy\b|\bgh release (create|upload)\b|\bxcodebuild\b/);
  }
});
