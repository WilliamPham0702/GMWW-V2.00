import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const app=read("server-game/current/app.js");
const html=read("server-game/current/GMWW.html");
const worker=read("src/index.js");
const deploy=read(".github/workflows/deploy-production.yml");
const pkg=JSON.parse(read("package.json"));
const lock=JSON.parse(read("package-lock.json"));
const shell="3.17";

test("task approval is a newer OTA than the previously released V3.30",()=>{
  const version="3.83";
  assert.equal(pkg.version,version+".0");
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[""].version,pkg.version);
  assert.match(app,/const VERSION='3\.83';/);
  assert.match(worker,/VERSION="V3\.83",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-383"/);
  assert.ok(Number(version.split(".")[1])>30,"same-version deployment cannot trigger installed app OTA");
  assert.equal(shell,"3.17");
  assert.match(html,/<title>GMWW V3\.83<\/title>/);
  assert.match(html,/app\.js\?v=3\.83-ai-support/);
});

test("newly delivered runtime contains owner-controlled approve and skip actions",()=>{
  assert.match(app,/function gmwwTaskReviewLink\(task,mode\)/);
  assert.match(app,/XÁC NHẬN HOÀN THÀNH/);
  assert.match(app,/BỎ QUA/);
  assert.match(app,/github\.com\/WilliamPham0702\/GMWW-V2\.00\/issues/);
  assert.match(html,/id="gmwwTasksOpenList"/);
  assert.match(html,/gmww-task-review-help/);
  assert.match(deploy,/GMWW task review controls verified in live OTA runtime/);
  assert.match(deploy,/TASK_APP_URL/);
  assert.match(deploy,/TASK_HTML_URL/);
});

test("GMWW versions are synchronized without a native IPA change",()=>{
  const swift=read("server-game/GMWW-Server/GameView.swift");
  const pbx=read("server-game/GMWW-Server.xcodeproj/project.pbxproj");
  assert.match(worker,/NATIVE_SHELL_VERSION="3\.17"/);
  assert.match(pbx,/MARKETING_VERSION = 3\.17;/);
  assert.match(swift,/active\.compare\(shellVersion, options: \.numeric\) == \.orderedAscending/);
});
