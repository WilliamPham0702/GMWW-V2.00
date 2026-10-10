import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const begin=source.indexOf('async function playVerifiedArtworkData(kind,id){');
const end=source.indexOf('async function playRoleArtworkData(role)',begin);
assert.ok(begin>=0&&end>begin);

function artworkHarness({protocol,failLocal=false,builtIn=true}={}){
  const requested=[];
  const file='assets/role-artwork-v251/original/role-test.webp';
  const data='data:image/webp;base64,'+'A'.repeat(200);
  const fakeBlob={type:'image/webp',size:200};
  const ctx={
    location:{protocol:protocol||'file:'},GMWW_SERVER_BASE:'https://gmww-v2-00.williampham0702.workers.dev',
    resolveArtwork:async()=>file,
    builtinRoleArtwork:()=>builtIn?file:'',
    fetch:async(url)=>{
      requested.push(String(url));
      if(failLocal&&url===file)throw new TypeError('Load failed');
      return {ok:true,blob:async()=>fakeBlob};
    },
    createImageBitmap:async()=>({width:300,height:300,close(){}}),
    playBlobDataUrl:async()=>data,
    document:{createElement(){throw new Error('unexpected canvas')}}
  };
  const get=vm.runInNewContext(source.slice(begin,end)+';playVerifiedArtworkData',ctx);
  return {get,requested,file,data};
}

test('Native WKWebView fetches the matching canonical artwork through a CORS-enabled Worker route',async()=>{
  const h=artworkHarness({protocol:'file:'});
  assert.equal(await h.get('cards','role-test'),h.data);
  assert.deepEqual(h.requested,['https://gmww-v2-00.williampham0702.workers.dev/api/gm/template-role-artwork/role-test']);
});

test('Safari Load failed falls back only for canonical roles; custom images are not replaced',async()=>{
  const h=artworkHarness({protocol:'https:',failLocal:true});
  assert.equal(await h.get('cards','role-test'),h.data);
  assert.equal(h.requested.length,2);
  const custom=artworkHarness({protocol:'file:',failLocal:true,builtIn:false});
  await assert.rejects(custom.get('cards','role-test'),/Không đọc được Artwork role-test/);
  assert.deepEqual(custom.requested,[custom.file]);
});

test('Template save exposes a retry message and retains draft on network failure',()=>{
  const code=source.slice(source.indexOf('async function savePlayGame(){'),source.indexOf('function playRandomInt(',source.indexOf('async function savePlayGame(){')));
  assert.match(code,/Load failed\|Failed to fetch\|Network request failed/);
  assert.match(code,/danh sách Vai Trò đã chọn được giữ nguyên/);
  assert.match(code,/playSceneState\.gameTemplateId=String\(cached\?\.template\?\.id\|\|templateId\)/);
});

test('Only safe role identifiers are proxied, with CORS and exact immutable runtime path',()=>{
  assert.match(worker,/templateRoleArtwork=url\.pathname\.match\(\/\^\\\/api\\\/gm\\\/template-role-artwork\\\/\(\[A-Za-z0-9_-\]\{1,120\}\)\$\//);
  assert.match(worker,/new URL\("\/updates\/runtime\/"\+VERSION\+"\/assets\/role-artwork-v251\/original\/"/);
  assert.match(worker,/headers:\{\.\.\.corsHeaders\(\),"content-type":"image\/webp"/);
});
