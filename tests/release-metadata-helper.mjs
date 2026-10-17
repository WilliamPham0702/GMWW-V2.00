import assert from 'node:assert/strict';
import fs from 'node:fs';
export const currentRuntimeVersion=fs.readFileSync('server-game/current/app.js','utf8').match(/const VERSION='([0-9.]+)'/)?.[1];
export function assertCurrentRelease(){
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  const runtime=app.match(/const VERSION='([0-9.]+)'/)?.[1];
  assert.match(String(runtime),/^\d+\.\d+$/);
  assert.equal(worker.match(/\bVERSION="V([0-9.]+)"/)?.[1],runtime);
  assert.equal(html.match(/<title>GMWW V([0-9.]+)<\/title>/)?.[1],runtime);
  assert.ok(html.includes('app.js?v='+runtime),'HTML must load the current app revision');
  assert.ok(html.includes('style.css?v='+runtime),'HTML must load the current CSS revision');
  assert.equal(worker.match(/UPDATE_CHANNEL_REV="([^"]+)"/)?.[1],'runtime-'+runtime.replaceAll('.',''));
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  assert.equal(pkg.version,runtime+'.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  const shell=worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1];
  const project=fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
  assert.equal(project.match(/MARKETING_VERSION = ([^;]+);/)?.[1],shell);
  assert.ok(runtime.localeCompare(shell,undefined,{numeric:true})>=0,'Runtime cannot predate Native shell');
}
