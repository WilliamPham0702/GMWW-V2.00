// Focused, isolated Worker/SQLite test for PR #626. No production credentials.
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const state=await mkdtemp(path.join(tmpdir(),'gmww-rule-pr626-'));
const port=8794,base='http://127.0.0.1:'+port;
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev',
 '--local','--ip','127.0.0.1','--port',String(port),'--inspector-port','9294',
 '--persist-to',state],{stdio:['ignore','pipe','pipe'],
 env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let logs='';
for(const stream of [worker.stdout,worker.stderr])stream.on('data',data=>{
 logs=(logs+data).slice(-10000);
});
try{
 let ready=false;
 for(let attempt=0;attempt<120;attempt++){
  if(worker.exitCode!==null)throw Error('Worker exited before ready: '+logs);
  try{
   const response=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});
   if(response.ok){ready=true;break;}
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw Error('Worker did not become healthy: '+logs);
 const exitCode=await new Promise((resolve,reject)=>{
  const test=spawn(process.execPath,['tests/worker-day-artifact-inspection-pr626-e2e.mjs'],{
    stdio:'inherit',env:{...process.env,GMWW_TEST_URL:base}});
  test.once('error',reject);test.once('exit',resolve);
 });
 if(exitCode!==0)throw Error('Day Artifact real Worker E2E failed: '+exitCode);
}finally{
 worker.kill('SIGTERM');
 await new Promise(resolve=>{
  if(worker.exitCode!==null)return resolve();
  worker.once('exit',resolve);
  setTimeout(()=>{worker.kill('SIGKILL');resolve()},3000).unref();
 });
 await rm(state,{recursive:true,force:true});
}
