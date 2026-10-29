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

// Tests with eight new users must not inherit other scenarios' auth-rate budgets.
async function runIsolated(file,port,inspector){
 const isolatedState=await mkdtemp(path.join(tmpdir(),'gmww-rule-584-isolated-'));
 const url='http://127.0.0.1:'+port;
 const isolated=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev',
  '--local','--ip','127.0.0.1','--port',port,'--inspector-port',inspector,
  '--persist-to',isolatedState],{stdio:['ignore','pipe','pipe'],
  env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 let message='';
 for(const stream of [isolated.stdout,isolated.stderr])
  stream.on('data',b=>{message=(message+b).slice(-12000)});
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   if(isolated.exitCode!==null)throw new Error('Isolated Worker exited: '+message);
   try{const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});
    if(response.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,500));
  }
  if(!ready)throw new Error('Isolated Worker readiness timeout: '+message);
  const code=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[file],{stdio:'inherit',
    env:{...process.env,GMWW_TEST_URL:url}});
   child.on('error',reject);child.on('exit',resolve);
  });
  if(code!==0)throw new Error(file+' isolated E2E failed (exit '+code+')');
 }finally{
  isolated.kill('SIGTERM');
  await new Promise(resolve=>{if(isolated.exitCode!==null)return resolve();
   isolated.once('exit',resolve);
   setTimeout(()=>{isolated.kill('SIGKILL');resolve()},3000).unref()});
  await rm(isolatedState,{recursive:true,force:true});
 }
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
 // One fresh Worker per scenario, without bypassing the real rate limiter.
 await runIsolated('tests/worker-artifact-role-swap-e2e.mjs','8795','9235');
 await runIsolated('tests/worker-artifact-steal-e2e.mjs','8796','9236');
 await runIsolated('tests/worker-artifact-function-copy-e2e.mjs','8797','9237');
 await runIsolated('tests/worker-artifact-link-e2e.mjs','8798','9238');
 await runIsolated('tests/worker-ghost-clue-e2e.mjs','8799','9239');
 await runIsolated('tests/worker-artifact-night-transformations-e2e.mjs','8800','9240');
}finally{
 worker.kill('SIGTERM');
 await new Promise(resolve=>{if(worker.exitCode!==null)return resolve();worker.once('exit',resolve);setTimeout(()=>{worker.kill('SIGKILL');resolve()},3000).unref()});
 await rm(state,{recursive:true,force:true});
}
