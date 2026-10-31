import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('PR677 DEMO Online Server remains authoritative and no live rooms are rewritten',()=>{
 const core=read('src/index.js'),gm=read('server-game/src/30-village-and-setup.part');
 assert.ok(core.includes('roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode)'));
 assert.ok(core.includes('const roomMode=desiredDemo?"online":'));
 assert.ok(core.includes('ROOM_MODE_REQUIRES_EMPTY_RESET'));
 assert.ok(gm.includes("roomMode:(target==='online'||target==='demo')?'online':'offline'"));
});
test('PR677 release requires same-SHA CI, rollback and immutable Runtime',()=>{
 const w=read('.github/workflows/deploy-demo-transport-677.yml');
 for(const p of ['Check Player Web Worker','pr677-worker-only-release','git ls-remote origin refs/heads/main','git diff --quiet gmww-v3.280','previous_version','Roll back to saved Worker version','npx wrangler deploy','npm run check'])
   assert.ok(w.includes(p),p);
 assert.ok(read('.github/scripts/ci-browser-scope.mjs').includes("mode:'pr677-worker-only-release'"));
 assert.ok(read('.github/workflows/check-player-web.yml').includes("mode == 'pr677-worker-only-release'"));
 assert.ok(read('.github/workflows/github-runtime-ota.yml').includes('PR677 Worker-only: no duplicate Runtime'));
 assert.ok(read('.github/workflows/deploy-production.yml').includes('GMWW-PR677-WORKER-ONLY-RELEASE-20261031.md'));
});

test('PR690 recovery uses full Git history and focused, rollback-protected Worker deploy',()=>{
 const workflow=read('.github/workflows/deploy-demo-transport-677.yml');
 assert.match(workflow,/fetch-depth: 0/);
 assert.ok(workflow.includes('pr677-worker-recovery'));
 assert.ok(workflow.includes('git ls-remote origin refs/heads/main'));
 assert.ok(workflow.includes('Roll back to saved Worker version'));
 assert.ok(read('.github/scripts/ci-browser-scope.mjs').includes("mode:'pr677-worker-recovery'"));
 assert.ok(read('.github/workflows/check-player-web.yml').includes("mode == 'pr677-worker-recovery'"));
 assert.ok(read('.github/workflows/deploy-production.yml').includes('docs/releases/GMWW-PR690-DEMO-ONLINE-DEPLOY-RECOVERY-20261031.md'));
 assert.ok(read('.github/workflows/github-runtime-ota.yml').includes('PR690 DEMO Worker recovery only'));
});
