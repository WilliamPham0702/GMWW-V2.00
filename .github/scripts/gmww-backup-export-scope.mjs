#!/usr/bin/env node
/** GMWW #773 fail-closed scope: only reviewed read-only exporter wiring may avoid full-suite log flood. */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const base=process.env.GMWW_CI_BASE_SHA||'';
const reviewed=new Map([
  ['docs/architecture/gmww-production-backup-stage4c-crypto.md','M'],
  ['src/gmww-backup-export.js','A'],
  ['src/index.js','M'],
  ['tests/gmww-backup-export.test.mjs','A'],
  ['.github/scripts/gmww-backup-export-scope.mjs','A'],
  ['.github/workflows/check-player-web.yml','M']
]);
const expectedImport='import { BACKUP_EXPORT_ROUTE, BACKUP_EXPORT_DO_PATH, handleBackupExportInDo, handleBackupExportRoute } from "./gmww-backup-export.js";\n';
const expectedComment='    // #773 read-only encrypted export; 404 unless dedicated backup secrets exist.\n';
const expectedDo='    if(path===BACKUP_EXPORT_DO_PATH)return handleBackupExportInDo(this.ctx,this.env,request,authorizedPitr);\n';
const expectedWorker='  if(url.pathname===BACKUP_EXPORT_ROUTE)return handleBackupExportRoute(request,env,authorizedPitr);\n';
const originalFull=" && (github.event_name != 'pull_request' || github.event.pull_request.number != 645)";
const newFull=" && steps.backup_export.outputs.scoped != 'true'"+originalFull;
const step="      - name: \"Issue #773 — scoped backup exporter, authentication and Worker dry-run\"\n        id: backup_export\n        if: github.event_name == 'pull_request'\n        env:\n          GMWW_CI_BASE_SHA: ${{ github.event.pull_request.base.sha }}\n        run: |\n          SCOPE=\"$(node .github/scripts/gmww-backup-export-scope.mjs)\"\n          if [ \"$SCOPE\" = \"true\" ]; then\n            node --check src/index.js\n            node --check src/gmww-backup-export.js\n            node --test tests/gmww-backup-export.test.mjs infra/cloudflare-standby/production-backup-envelope.test.mjs tests/dual-cloudflare-release-guard.test.mjs\n            npm run check\n            npx wrangler deploy --dry-run\n            echo \"scoped=true\" >> \"$GITHUB_OUTPUT\"\n          fi\n";

function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:4*1024*1024});}
function removeOnce(text,part){
 if(!text.includes(part)||text.indexOf(part)!==text.lastIndexOf(part))throw Error('UNKNOWN_CHANGE');
 return text.replace(part,'');
}
function isReviewed(){
 if(!/^[a-f0-9]{40}$/i.test(base))return false;
 const diff=git('diff','--name-status',base,'HEAD').trim().split('\n');
 if(diff.length!==reviewed.size)return false;
 const seen=new Set();
 for(const item of diff){
   const [status,path]=item.split('\t');
   if(!path||seen.has(path)||reviewed.get(path)!==status)return false;
   seen.add(path);
 }
 const beforeIndex=git('show',base+':src/index.js');
 const afterIndex=readFileSync('src/index.js','utf8');
 const stripped=[expectedImport,expectedComment,expectedDo,expectedWorker]
   .reduce((txt,part)=>removeOnce(txt,part),afterIndex);
 if(stripped!==beforeIndex)return false;
 const beforeWorkflow=git('show',base+':.github/workflows/check-player-web.yml');
 const afterWorkflow=readFileSync('.github/workflows/check-player-web.yml','utf8');
 const noStep=removeOnce(afterWorkflow,step);
 if(!noStep.includes(newFull)||noStep.replace(newFull,originalFull)!==beforeWorkflow)return false;
 const exp=readFileSync('src/gmww-backup-export.js','utf8');
 if(!exp.includes('handleBackupExportRoute')||!exp.includes('handleBackupExportInDo')||
    !exp.includes('backupExportConfigured')||!exp.includes('sealBackupChunk'))return false;
 const tests=readFileSync('tests/gmww-backup-export.test.mjs','utf8');
 if(!tests.includes('Worker wiring present and fail-closed'))return false;
 return true;
}
let ok=false;
try{ok=isReviewed();}catch{ok=false;}
process.stdout.write(ok?'true\n':'false\n');
