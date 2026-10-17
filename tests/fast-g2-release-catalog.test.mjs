import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as release from '../src/gmww-release-catalog-policy.js';
const origin='https://gmww-v2-00.williampham0702.workers.dev';
const bytes=Buffer.from('verified asset');
const sha=createHash('sha256').update(bytes).digest('hex');
const core=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp','home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
function manifest(){return {schema:1,releaseType:'runtime',releaseVersion:'3.999',runtimeVersion:'3.999',shellVersion:'3.110',minimumShellVersion:'3.110',delete:[],runtime:{files:core.map(path=>({path,url:origin+'/updates/runtime/V3.999/'+path,sha256:sha}))}}}
async function build(m=manifest(),read=()=>bytes){return release.buildReleaseCatalog(m,read)}
async function select(c,version='3.999',shell='3.110'){return release.selectBuildVerifiedManifest(c,version,shell)}
test('future OTA catalog serves exact schema 1 manifest without asset fetches',async()=>{
  assert.equal(typeof release.buildReleaseCatalog,'function');
  const m=manifest(),catalog=await build(m);
  assert.deepEqual(await select(catalog),m);
});
test('catalog rejects tampering and stale release or native shell',async()=>{
  const c=await build();
  assert.equal(await select(c,'3.998'),null);
  assert.equal(await select(c,'3.999','3.17'),null);
  c.manifest.runtime.files[0].sha256='b'.repeat(64);
  assert.equal(await select(c),null);
  assert.equal(await select(null),null);
});
test('producer checks every packaged byte, including non-core files',async()=>{
  const m=manifest();m.runtime.files.push({path:'audio/call.mp3',url:origin+'/updates/runtime/V3.999/audio/call.mp3',sha256:sha});
  await assert.rejects(build(m,path=>path.endsWith('.mp3')?Buffer.from('corrupt'):bytes),/checksum/i);
});
test('catalog rejects unsafe or incomplete metadata',async()=>{
  const variants=[m=>m.runtime.files.pop(),m=>m.runtime.files.push({...m.runtime.files[0]}),m=>m.runtime.files[0].path='../GMWW.html',m=>m.runtime.files[0].url='https://evil.example/GMWW.html',m=>m.delete.push('saved.json'),m=>m.runtime.files[0].sha256='invalid',m=>m.minimumShellVersion='3.17'];
  for(const change of variants){const m=manifest();change(m);await assert.rejects(build(m));}
});

async function workerWith(catalog,bases=[]){
  const {readFile,writeFile,mkdtemp}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {resolve,join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const src=resolve('src');
  let source=await readFile(join(src,'index.js'),'utf8');
  source=source.replace(/VERSION="V[0-9.]+"/, 'VERSION="V3.121"');
  source=source.replace('import {releaseCatalog} from "./gmww-release-catalog.js";','const releaseCatalog='+JSON.stringify(catalog)+';');
  source=source.replace('import {releaseBases} from "./gmww-release-bases.js";','const releaseBases='+JSON.stringify(bases)+';');
  source=source.replace('import { DurableObject } from "cloudflare:workers";','class DurableObject {}');
  source=source.replace(/from "(\.\/[^"]+)"/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(resolve(src,p)).href));
  source=source.replace(/import "(\.\.\/assets\/[^"]+)";/g,(_,p)=>'import '+JSON.stringify(pathToFileURL(resolve(src,p)).href)+';');
  const dir=await mkdtemp(join(tmpdir(),'gmww-catalog-'));const target=join(dir,'worker.mjs');await writeFile(target,source);
  return (await import(pathToFileURL(target).href)).default;
}
test('real Worker serves catalog and filtered notes with no asset dependency',async()=>{
  const m=manifest();
  m.releaseVersion=m.runtimeVersion='3.121';
  m.releaseNotes=['V3.121: current','V3.120: already installed'];
  m.runtime.files=m.runtime.files.map(f=>({...f,url:f.url.replace('V3.999','V3.121')}));
  const worker=await workerWith(await build(m));
  let calls=0;
  const response=await worker.fetch(new Request(origin+'/api/update/manifest?current=3.120'),{ASSETS:{fetch(){calls++;throw Error('asset network offline')}}});
  assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.manifestSource,'build-verified');
  assert.deepEqual(body.releaseNotes,['V3.121: current']);assert.equal(calls,0);
});
test('real Worker preserves fail-closed fallback for missing or damaged catalog',async()=>{
  for(const catalog of [null,{schema:1,sha256:'0'.repeat(64),manifest:manifest()}]){
    const worker=await workerWith(catalog);
    const response=await worker.fetch(new Request(origin+'/api/update/manifest'),{});
    assert.equal(response.status,503);
    assert.equal((await response.json()).error,'UPDATE_MANIFEST_UNAVAILABLE');
  }
});
test('real Worker uses verified base checksums, falling back to full for corrupt or unknown bases',async()=>{
  const make=v=>{const m=manifest();m.releaseVersion=m.runtimeVersion=v;m.runtime.files=m.runtime.files.map(f=>({...f,url:f.url.replace('V3.999','V'+v)}));return m};
  const before=make('3.120'),after=make('3.121');
  const base=await build(before);
  // Change the target's app bytes and rebuild its integrity envelope.
  after.runtime.files[1].sha256=createHash('sha256').update('new app').digest('hex');
  const changed=await build(after,path=>path==='app.js'?Buffer.from('new app'):bytes);
  const worker=await workerWith(changed,[base]);
  const request=current=>new Request(origin+'/api/update/manifest?current='+current);
  const delta=await (await worker.fetch(request('3.120'),{})).json();
  assert.equal(delta.deltaFrom,'3.120');assert.deepEqual(delta.runtime.files.map(f=>f.path),['app.js']);
  const full=await (await worker.fetch(request('3.119'),{})).json();assert.equal(full.runtime.files.length,core.length);
  base.sha256='0'.repeat(64);
  const corrupt=await workerWith(changed,[base]);
  const fallback=await (await corrupt.fetch(request('3.120'),{})).json();
  assert.equal(fallback.runtime.files.length,core.length);assert.equal(fallback.deltaFrom,undefined);
});
