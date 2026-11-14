import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const part=readFileSync('server-game/src/10-library-and-settings/20-audio-library.part','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const start=part.indexOf('async function gmwwExportAudioOnly()');
const end=part.indexOf('async function renderAudio(){',start);
const code=part.slice(start,end);

test('Audio-only export is included in the assembled GM Server app',()=>{
  assert.ok(start>=0&&end>start);
  assert.ok(app.includes(code));
  assert.match(part,/id="gmwwExportAudioOnly"/);
  assert.match(part,/exportAudioButton\.onclick=\(\)=>\{void gmwwExportAudioOnly\(\)\}/);
});

test('Audio-only export includes actual MP3 bytes, SHA-256, missing manifest and no private game state',async()=>{
  const audio=new Uint8Array([73,68,51,4,0,0,0,0,0,0,1,2,3,4]);
  const shared=[];
  const ctx={
    state:{audio:{cards:[{id:'role_seer',name:'Tiên Tri',fileName:'seer.mp3'},
      {id:'role_missing',name:'Vai chưa có file'}],system:[]},members:[{token:'SECRET'}],roomCode:'PRIVATE'},
    audioBlobKey:(kind,id)=>kind+'|'+id,
    dbGet:async key=>key==='cards|role_seer'?{blob:new Blob([audio],{type:'audio/mpeg'})}:null,
    bundledAudioBlob:()=>null,
    crypto:webcrypto,Blob,Uint8Array,Map,Array,String,Number,Object,Date,
    btoa:value=>Buffer.from(value,'binary').toString('base64'),
    File:class{constructor(chunks,name,options){this.data=chunks.join('');this.name=name;this.type=options.type}async text(){return this.data}},
    navigator:{canShare:()=>true,share:async data=>shared.push(JSON.parse(await data.files[0].text()))},
    showLocalExportViewer:()=>{throw new Error('share fallback unexpectedly used')},
    alert:()=>{throw new Error('audio should exist')}
  };
  vm.createContext(ctx);
  vm.runInContext(code+';globalThis.runExport=gmwwExportAudioOnly',ctx);
  await ctx.runExport();
  assert.equal(shared.length,1);
  const out=shared[0];
  assert.equal(out.format,'gmww-audio-only-v1');
  assert.equal(out.clips.length,1);
  assert.equal(out.missing.length,1);
  assert.equal(out.clips[0].kind,'cards');
  assert.equal(out.clips[0].targetId,'role_seer');
  assert.equal(out.clips[0].sha256,Buffer.from(await webcrypto.subtle.digest('SHA-256',audio)).toString('hex'));
  assert.deepEqual(Buffer.from(out.clips[0].base64,'base64'),Buffer.from(audio));
  assert.equal(out.missing[0].targetId,'role_missing');
  assert.doesNotMatch(JSON.stringify(out),/SECRET|PRIVATE|roomCode|members/);
});

test('Missing-only library cannot claim a successful export',async()=>{
  let alerts=0,shares=0;
  const ctx={
    state:{audio:{cards:[{id:'role_missing',name:'Missing'}]}},
    audioBlobKey:(k,id)=>k+'|'+id,dbGet:async()=>null,bundledAudioBlob:()=>null,
    crypto:webcrypto,Blob,Uint8Array,Map,Array,String,Number,Object,Date,
    navigator:{share:async()=>shares++},alert:()=>alerts++,
    btoa:()=>'',File:class{},showLocalExportViewer:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(code+';globalThis.runExport=gmwwExportAudioOnly',ctx);
  await ctx.runExport();
  assert.equal(shares,0);
  assert.equal(alerts,1);
});
