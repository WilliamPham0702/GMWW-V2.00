// Fail-closed PR #659 scope: only the audited update manager version checks.
// Unknown source edits, deletions, or any missing file require full regression.
import fs from 'node:fs';

const alignment = String.raw`function gmwwUpdateAlignment(runtime,server,latest){
  const values=[runtime,server,latest].map(v=>String(v||'').replace(/^V/i,''));
  if(!values.every(v=>/^\d+\.\d+(?:\.\d+)?$/.test(v)))return 'unverified';
  if(gmwwVersionCompare(server,latest)!==0)return 'channel_mismatch';
  const delta=gmwwVersionCompare(runtime,server);
  return delta>0?'runtime_ahead':delta<0?'update_available':'synchronized';
}
`;
const action = "  else if(kind==='ahead'){if(title)title.textContent='Runtime mới hơn Server — cần xác minh.';if(hint)hint.textContent='Giữ nguyên Runtime đang cài. Không hạ cấp hoặc cài lại IPA.'}\n";
const downgrade = String.raw`  const target=String(gmwwUpdateManifest.releaseVersion||gmwwUpdateManifest.runtimeVersion||'').replace(/^V/i,'');
  if(!gmwwVersionVerified(target)||gmwwVersionCompare(target,gmwwRuntimeVersion())<=0){
    setUpdateAction('ahead');
    setUpdateUi('warn','KHÔNG HẠ CẤP','Runtime V'+gmwwRuntimeVersion()+' đang cài không cũ hơn gói V'+(target||'—')+'.','Chỉ cài bản phát hành chính thức mới hơn, đã kiểm tra SHA-256.');
    return false;
  }
`;
const ahead = String.raw`    if(gmwwUpdateAlignment(gmwwRuntimeVersion(),server,latest)==='runtime_ahead'){
      setUpdateAction('ahead');
      setUpdateUi('warn','LỆCH PHIÊN BẢN','Game Runtime V'+gmwwRuntimeVersion()+' mới hơn Server V'+server+'.','Giữ Runtime hiện tại, không hạ cấp. Chỉ đồng bộ khi Server và gói phát hành đã được xác minh.');
      return null;
    }
`;
const oldOps = String.raw`      const aligned=manifest?.ok&&server?.ok&&serverVersion===updateVersion;
      const shell=typeof gmwwShellVersion==='function'?gmwwShellVersion():'—';
      const runtime=typeof gmwwRuntimeVersion==='function'?gmwwRuntimeVersion():'—';`;
const newOps = String.raw`      const shell=typeof gmwwShellVersion==='function'?gmwwShellVersion():'—';
      const runtime=typeof gmwwRuntimeVersion==='function'?gmwwRuntimeVersion():'—';
      const aligned=manifest?.ok&&server?.ok&&gmwwUpdateAlignment(runtime,serverVersion,updateVersion)==='synchronized';`;

const transformations=[
  [alignment,''],
  [action,''],
  [downgrade,''],
  [ahead,''],
  [newOps,oldOps],
  ["'Runtime, Server hoặc kênh cập nhật chưa khớp, xem Cập Nhật Hệ Thống.'",
   "'Server và kênh cập nhật chưa khớp, xem Cập Nhật Hệ Thống.'"]
];

export function restoreRuntimeDrift(source,indices){
  if(typeof source!=='string')return null;
  let result=source;
  for(const i of indices){
    const [replacement,original]=transformations[i];
    if(result.split(replacement).length!==2)return null;
    result=result.replace(replacement,original);
  }
  return result;
}

export function isRuntimeDriftScope(changes){
  const expected=new Map([
    ['server-game/current/app.js','M'],
    ['server-game/src/10-library-and-settings.part','M'],
    ['server-game/src/20-members-and-roster.part','M'],
    ['tests/runtime-server-version-drift.test.mjs','A'],
    ['.github/scripts/runtime-server-drift-scope.mjs','A'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['tests/runtime-server-drift-scope.test.mjs','A'],
    ['docs/releases/GMWW-RUNTIME-SERVER-DRIFT-20261031.md','A']
  ]);
  if(!Array.isArray(changes)||changes.length!==expected.size||
     new Set(changes.map(x=>x.path)).size!==expected.size||
     changes.some(x=>!expected.has(x.path)||expected.get(x.path)!==x.status))return false;
  const byPath=new Map(changes.map(x=>[x.path,x]));
  const indices=new Map([
    ['server-game/current/app.js',[0,1,2,3,4,5]],
    ['server-game/src/10-library-and-settings.part',[0,1,2,3]],
    ['server-game/src/20-members-and-roster.part',[4,5]]
  ]);
  for(const [path,ids] of indices){
    const entry=byPath.get(path);
    if(restoreRuntimeDrift(entry.after,ids)!==entry.before)return false;
  }
  if(!byPath.get('tests/runtime-server-version-drift.test.mjs')?.after?.includes("'runtime_ahead'"))return false;
  if(!byPath.get('.github/scripts/ci-browser-scope.mjs')?.after?.includes("if(isRuntimeDriftScope(changes))return 'runtime-server-drift'"))return false;
  if(!byPath.get('.github/workflows/check-player-web.yml')?.after?.includes("steps.scope.outputs.mode == 'runtime-server-drift'"))return false;
  if(!byPath.get('tests/runtime-server-drift-scope.test.mjs')?.after?.includes("fail closed"))return false;
  if(!byPath.get('docs/releases/GMWW-RUNTIME-SERVER-DRIFT-20261031.md')?.after?.includes('V3.283'))return false;
  const modules=['00-core-and-library.part','10-library-and-settings.part',
    '20-members-and-roster.part','30-village-and-setup.part',
    '40-battle-and-timeline.part','45-online-chat.part',
    '50-roles-and-artifacts.part'];
  try{
    return fs.readFileSync('server-game/current/app.js','utf8')===
      modules.map(n=>fs.readFileSync('server-game/src/'+n,'utf8')).join('');
  }catch{return false}
}
