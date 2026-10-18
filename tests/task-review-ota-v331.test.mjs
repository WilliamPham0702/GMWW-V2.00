import {assertCurrentRelease,currentRuntimeVersion} from './release-metadata-helper.mjs';
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
const shell="3.121";

test("task approval is a newer OTA than the previously released V3.30",()=>{
  const version=currentRuntimeVersion;
  assert.equal(pkg.version,version+".0");
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[""].version,pkg.version);
  assertCurrentRelease();
  assert.ok(Number(version.split(".")[1])>30,"same-version deployment cannot trigger installed app OTA");
  assertCurrentRelease();
});

test("new Runtime OTA removes inaccurate task progress while providing a working Cloudflare entry",()=>{
  assert.doesNotMatch(app,/function gmwwTaskReviewLink\(|gmwwTasksRefresh/);
  assert.doesNotMatch(html,/id="gmwwTasksOpenList"|settingsGroupTasks|gmww-task-review-help/);
  assert.match(html,/id="gmwwCloudflareOpen"/);
  assert.match(html,/id="gmwwCloudflarePanel"/);
  assert.match(html,/window\.location\.assign\(actions\)/);
  assert.match(deploy,/Cloudflare management entry verified in live OTA runtime/);
  assert.match(deploy,/TASK_APP_URL/);
  assert.match(deploy,/TASK_HTML_URL/);
});

test("GMWW versions are synchronized without a native IPA change",()=>{
  const swift=read("server-game/GMWW-Server/GameView.swift");
  const pbx=read("server-game/GMWW-Server.xcodeproj/project.pbxproj");
  assert.match(worker,/NATIVE_SHELL_VERSION="3\.110"/);
  assert.match(pbx,/MARKETING_VERSION = 3\.110;/);
  assert.match(swift,/active\.compare\(shellVersion, options: \.numeric\) == \.orderedAscending/);
});
