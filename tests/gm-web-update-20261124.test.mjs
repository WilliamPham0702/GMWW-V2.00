// V3.331: GM Server trên PC (web/PWA) cập nhật bằng cách tải lại trang khi server đã phục vụ bản mới; ẩn Thủ Công/Tải IPA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('server-game/src/10-library-and-settings/40-server-link-and-updates.part','utf8');
const pick=name=>{const i=src.indexOf(name);assert.ok(i>=0,name);let d=0,j=src.indexOf('{',src.indexOf(')',i));for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)break}return src.slice(i,j+1)};

function run(served,{auto=false,already=false}={}){
  const ui=[],state={reloaded:0,deleted:[]},session=already?{'GMWW_WEB_RELOADED_3.331':'1'}:{};
  const ctx={VERSION:'3.330',location:{origin:'https://x.dev',pathname:'/gm-server/',reload:()=>state.reloaded++},window:{GMWW_GM_WEB:true},
    fetch:async()=>({ok:true,text:async()=>"const VERSION='"+served+"';"}),
    gmwwVersionCompare:(a,b)=>a.localeCompare(b,undefined,{numeric:true}),
    setUpdateAction:()=>{},setUpdateUi:(...a)=>ui.push(a[1]),
    sessionStorage:{getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v}},
    caches:{keys:async()=>['gmww-gm-web-v1','other'],delete:async k=>{state.deleted.push(k)}},navigator:{}};
  vm.runInNewContext([pick('function gmwwIsWebGm'),pick('async function gmwwWebServedVersion'),pick('async function gmwwWebReloadLatest')].join('\n')+';this.go=gmwwWebReloadLatest',ctx);
  return ctx.go({auto}).then(r=>({r,ui,state}));
}

test('newer served version → clears web cache and reloads', async () => {
  const {r,state}=await run('3.331');
  assert.equal(r,true);assert.equal(state.reloaded,1);assert.deepEqual([...state.deleted],['gmww-gm-web-v1']);
});
test('server not newer → no reload loop, tells GM to wait', async () => {
  const {r,ui,state}=await run('3.330');
  assert.equal(r,false);assert.equal(state.reloaded,0);assert.ok(ui.includes('ĐANG PHÁT HÀNH'));
});
test('auto check reloads at most once per version per session', async () => {
  assert.equal((await run('3.331',{auto:true,already:true})).state.reloaded,0);
  assert.equal((await run('3.331',{auto:true})).state.reloaded,1);
});
test('web mode wiring: Auto/Manual buttons route to reload, IPA/manual buttons hidden, shell shows WEB', () => {
  assert.match(src,/async function installRuntimeUpdate\(\)\{\n  if\(gmwwIsWebGm\(\)\)return gmwwWebReloadLatest\(\);/);
  assert.match(src,/if\(gmwwIsWebGm\(\)\)\{void gmwwWebReloadLatest\(\);return true\}/);
  assert.match(src,/\['installManualRuntimeUpdate','downloadNewIPA'\]/);
  assert.match(src,/gmwwIsWebGm\(\)\?'WEB':'V'\+gmwwShellVersion\(\)/);
  assert.match(fs.readFileSync('server-game/src/10-library-and-settings/50-health-and-maintenance.part','utf8'),/gmwwWebUpdateSetup\(\);/);
  assert.match(fs.readFileSync('src/worker/http/gm-web.js','utf8'),/window\.GMWW_GM_WEB=true/);
});
