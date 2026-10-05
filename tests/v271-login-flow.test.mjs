import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.71 keeps authentication errors separate from post-login navigation errors',()=>{
  const live=read('src/gmww-members-live.js');
  const start=live.indexOf('async function login()'),end=live.indexOf('window.login=login',start),segment=live.slice(start,end);
  assert.ok(segment.includes("let d;"));
  assert.ok(segment.includes("d=await api('/api/members/login'"));
  assert.ok(segment.includes("saveSession(d)"));
  assert.ok(segment.includes("const resumed=await autoResumeActiveRoom()"));
  assert.ok(segment.includes("if(!resumed)await enterVillage()"));
  assert.ok(segment.includes("[GMWW post-login]"));
  assert.ok(segment.includes("Đã đăng nhập. Có lỗi khi khôi phục màn hình trước"));
});

test('CI smoke covers passwordless and password-protected member login plus session restore',()=>{
  const workflow=read('.github/workflows/check-player-web.yml');
  assert.ok(workflow.includes('/api/members/register'));
  assert.ok(workflow.includes('/api/members/login'));
  assert.ok(workflow.includes('/api/members/me'));
  assert.ok(workflow.includes('"error":"PASSWORD_REQUIRED"'));
  assert.ok(workflow.includes('"loginId":"ciuser1"'));
  assert.ok(workflow.includes('"loginId":"cipass1"'));
});

test('V2.71 metadata is aligned',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V2.71"'));
  assert.ok(app.includes("const VERSION='2.71';"));
  assert.ok(html.includes('GMWW V2.71'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 271;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.71;'));
  assert.equal(pkg.version,'2.71.0');
});
