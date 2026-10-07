import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.76 manual login is password-free and goes straight to the village',()=>{
  const live=read('src/gmww-members-live.js');
  const start=live.indexOf('async function login()'),end=live.indexOf('window.login=login',start),segment=live.slice(start,end);
  assert.ok(segment.includes("api('/api/members/login'"));
  assert.ok(segment.includes("JSON.stringify({loginId:user})"));
  assert.ok(segment.includes("saveSession(d);state.roomNavigationAuthorized=false;await enterVillage()"));
  assert.doesNotMatch(segment,/loginPass|PASSWORD_REQUIRED|autoResumeActiveRoom/);
});

test('CI smoke covers password-free register, login and session restore',()=>{
  const workflow=read('.github/workflows/check-player-web.yml');
  assert.ok(workflow.includes('/api/members/register'));
  assert.ok(workflow.includes('/api/members/login'));
  assert.ok(workflow.includes('/api/members/me'));
  assert.ok(workflow.includes('"loginId":"ciuser1"'));
  assert.doesNotMatch(workflow,/PASSWORD_REQUIRED|cipass1/);
});

test('Server disables legacy password enforcement when a member logs in',()=>{
  const server=read('src/index.js');
  const start=server.indexOf('async memberLogin(body)'),end=server.indexOf('async memberChangePassword',start),segment=server.slice(start,end);
  assert.ok(segment.includes('disableMemberPassword(member)'));
  assert.doesNotMatch(segment,/verifyPassword|PASSWORD_REQUIRED|INVALID_PASSWORD/);
});

test('V3.12 runtime metadata is aligned on the V3.11 native shell',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.12"'));
  assert.ok(app.includes("const VERSION='3.12';"));
  assert.ok(html.includes('GMWW V3.12'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 311;'));
  assert.ok(project.includes('MARKETING_VERSION = 3.11;'));
  assert.equal(pkg.version,'3.12.0');
});
