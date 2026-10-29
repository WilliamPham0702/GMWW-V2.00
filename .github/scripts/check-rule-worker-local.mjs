// Isolated real workerd/SQLite acceptance. Never uses Cloudflare credentials.
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const state=await mkdtemp(path.join(tmpdir(),'gmww-rule-584-'));
const base='http://127.0.0.1:8794';
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8794','--inspector-port','9234','--persist-to',state],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let log='';
for(const stream of [worker.stdout,worker.stderr])stream.on('data',b=>{log=(log+b).slice(-12000)});
async function run(file){
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,GMWW_TEST_URL:base}});child.on('error',reject);child.on('exit',resolve)});
 if(code!==0)throw new Error(file+' failed (exit '+code+')');
}
try{
 let ready=false;
 for(let i=0;i<120;i++){
  if(worker.exitCode!==null)throw new Error('Local Worker exited: '+log);
  try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw new Error('Local Worker readiness timeout: '+log);
 await run('tests/worker-night-rules-e2e.mjs');
 await run('tests/worker-card-artifact-e2e.mjs');
 await run('tests/worker-double-gallows-e2e.mjs');
 await run('tests/worker-disable-artifact-e2e.mjs');
 await run('tests/worker-passive-gallows-artifacts-e2e.mjs');
 await run('tests/worker-artifact-secret-destruction-e2e.mjs');
 await run('tests/worker-artifact-role-swap-e2e.mjs');
}finally{
 worker.kill('SIGTERM');
 await new Promise(resolve=>{if(worker.exitCode!==null)return resolve();worker.once('exit',resolve);setTimeout(()=>{worker.kill('SIGKILL');resolve()},3000).unref()});
 await rm(state,{recursive:true,force:true});
}
