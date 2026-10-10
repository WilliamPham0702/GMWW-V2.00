import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const from=app.indexOf('async function playSharedArtifactSignature(artifact){');
const to=app.indexOf('// Global server-side collection:',from);
assert.ok(from>=0&&to>from,'shared Artifact signer exists');

function makeSigner(store,themeId='theme-sea'){
  const code=app.slice(from,to)+';playSharedArtifactSignature';
  return vm.runInNewContext(code,{
    crypto:webcrypto,TextEncoder,Uint8Array,Blob,
    state:{themes:{activeId:themeId}},
    cardBlobKey:(theme,kind,id,type)=>[theme,kind,id,type].join('|'),
    dbGet:async key=>store.get(key)||null,
    playArtifactCardPayload:artifact=>({name:artifact.name,information:artifact.information||''})
  });
}

test('Artifact image-only change generates new server signature (same metadata)',async()=>{
  const store=new Map(),sig=makeSigner(store),id='artifact_mirror';
  const key='theme-sea|artifacts|'+id+'|display',card={id,name:'Tráng Gương'};
  store.set(key,{blob:new Blob(['red blue image A'],{type:'image/webp'})});
  const oldSignature=await sig(card);
  assert.match(oldSignature,/^[a-f0-9]{64}$/);
  assert.equal(await sig({...card}),oldSignature,'unchanged artwork remains cached');
  store.set(key,{blob:new Blob(['red blue image B'],{type:'image/webp'})});
  assert.notEqual(await sig(card),oldSignature,'image-only replacement must upload to server');
});

test('Shared Artifact signer reads full-size fallback and respects Sea theme',async()=>{
  const store=new Map(),id='artifact_seer',card={id,name:'Mắt Tiên Tri'};
  store.set('theme-sea|artifacts|'+id+'|full',{blob:new Blob(['full artwork'])});
  const sig=makeSigner(store);
  const full=await sig(card);
  store.set('theme-sea|artifacts|'+id+'|display',{blob:new Blob(['display artwork'])});
  assert.notEqual(await sig(card),full,'display artwork takes precedence');
  const anotherTheme=makeSigner(store,'theme-fantasy');
  assert.notEqual(await anotherTheme(card),await sig(card),'theme-specific signature differs');
});
