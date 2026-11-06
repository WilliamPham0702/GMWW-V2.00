#!/usr/bin/env node
// GMWW AUTO-DELIVERY V3.0: deterministic, fail-closed scope classification.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const playerTests=['tests/player-web-v3-iframe-drag.test.mjs','tests/player-web-online-actions-20261028.test.mjs','tests/online-player-fire-turn-dead-ui-20261031.test.mjs','tests/player-web-wolf-ballots-20261101.test.mjs','tests/player-web-card-drag-action-20261105.test.mjs','tests/verdict-auto-advance-5s-20261105.test.mjs'];
const sharedTests=['tests/gmww-play-interaction-rules.test.mjs','tests/online-chat-authority.test.mjs'];
function category(path){
  if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').includes('..'))return 'blocked';
  if(/(^|\/)(arena-3d|3d)(\/|$)/i.test(path))return 'frozen';
  if(/^server-game\/(GMWW-Server\/|GMWW-Server\.xcodeproj\/)/.test(path)||/\.swift$|\.entitlements$|Info\.plist$/.test(path))return 'native';
  if(path==='wrangler.jsonc')return 'blocked';
  if(path==='package.json'||path==='package-lock.json')return 'version';
  if(/^infra\/pages\/gamemasoi\//.test(path))return 'pages';
  if(/^server-game\/(current|shared|src)\//.test(path)||/^update-system\//.test(path)||
     /^assets\/(village|backgrounds|characters|role-artwork|gm)\//.test(path)||
     path==='.github/scripts/prepare-update-channel.mjs')return 'runtime';
  if(/^src\//.test(path)||/^assets\/(action-icons|avatars)\//.test(path))return 'worker';
  if(/^infra\/(cloudflare-standby|oracle-staging)\//.test(path)||/^oracle-staging\//.test(path))return 'ci';
  if(path==='AGENTS.md'||path==='README.md'||/^docs\//.test(path)||/^tests\//.test(path)||/^\.github\//.test(path))return 'ci';
  return 'blocked';
}
export function v3DeliveryPlan(paths){
 const files=[...new Set((paths||[]).map(x=>String(x||'').trim()).filter(Boolean))];
 if(!files.length)return {target:'none',risk:'low',hold:false,files,tests:[],reason:'empty-change'};
 const types=new Set(files.map(category));
 // PR #788 has explicit owner approval for a native microphone *validation* PR.
 // This target is never a Production/Runtime/IPA publication target.
 // Any path or binary mismatch keeps the original fail-closed native hold.
 const micNativeFiles=new Set([
  'server-game/GMWW-Server/GameView.swift',
  'server-game/GMWW-Server/Info.plist',
  'tests/native-ios-microphone-permission-20261104.test.mjs',
  'docs/releases/GMWW-IOS-NATIVE-MIC-PERMISSION-20261104.md',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-player-web.yml',
  '.github/scripts/v3-delivery-plan.mjs',
  'tests/v3-delivery-plan.test.mjs',
  'tests/ci-browser-scope.test.mjs'
 ]);
 const expectedNativeBlobs=new Map([
  ['server-game/GMWW-Server/GameView.swift','37d21b5ebf5a1999a451847019904e011dd30845'],
  ['server-game/GMWW-Server/Info.plist','cc6ffa91d3470a97d322cc44f41198f05969cd36']
 ]);
 const blobHash=p=>{
  const buf=fs.readFileSync(p);
  return createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
 };
 let nativeVerified=false;
 const micCoreFiles=['server-game/GMWW-Server/GameView.swift','server-game/GMWW-Server/Info.plist',
  'tests/native-ios-microphone-permission-20261104.test.mjs','docs/releases/GMWW-IOS-NATIVE-MIC-PERMISSION-20261104.md'];
 // Allowlist subset: every changed file must be approved and the four core files must be present.
 if(types.has('native')&&micCoreFiles.every(f=>files.includes(f))&&files.every(f=>micNativeFiles.has(f))){
  try{nativeVerified=[...expectedNativeBlobs].every(([p,sha])=>blobHash(p)===sha)}catch{}
 }
 if(nativeVerified)return {
  target:'native-verify',risk:'high',hold:false,files,
  tests:['tests/native-ios-microphone-permission-20261104.test.mjs',
         'tests/native-ipa-startup.test.mjs',
         'tests/native-ipa-release-gate.test.mjs',
         'tests/online-chat-authority.test.mjs'],
  reason:'approved-native-mic-validation-only-no-IPA-or-Runtime-deploy'
 };

 if(types.has('version')&&!types.has('runtime'))return {target:'blocked',risk:'critical',hold:true,files,tests:sharedTests,reason:'version-without-runtime-source'};
 if(types.has('blocked')||types.has('frozen')||types.has('native'))
   return {target:'blocked',risk:'critical',hold:true,files,tests:sharedTests,reason:types.has('frozen')?'frozen-3d':types.has('native')?'native-requires-separate-release':'unrecognized-or-sensitive-scope'};
 const deployTypes=[...types].filter(t=>t!=='ci'&&t!=='version');
 // A Runtime release necessarily includes the shared Worker/Server; Pages remains isolated.
 if(deployTypes.length>1&&!(deployTypes.length===2&&deployTypes.includes('runtime')&&deployTypes.includes('worker')))
   return {target:'blocked',risk:'critical',hold:true,files,tests:sharedTests,reason:'mixed-deployment-targets'};
 const target=deployTypes.includes('runtime')?'runtime':deployTypes[0]||'none';
 const core=files.some(p=>/^src\/(index\.js|gmww-demo-runner\.js|gmww-wolf-night-resolution\.js|gmww-online-action)/.test(p))||files.some(p=>/^server-game\/(current|shared|src)\//.test(p));
 const risk=target==='runtime'||core?'high':target==='worker'||target==='pages'?'medium':files.some(p=>p.startsWith('.github/'))?'high':'low';
 const tests=target==='worker'?playerTests:target==='runtime'?[...playerTests,...sharedTests]:
    target==='pages'?['tests/gamemasoi-pages-link.test.mjs']:
    files.some(p=>p.startsWith('.github/'))?['tests/ci-browser-scope.test.mjs']:[];
 return {target,risk,hold:false,files,tests,reason:'scoped'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];
 if(!file)throw Error('Usage: v3-delivery-plan.mjs <changed-paths.txt> [--field=target]');
 const plan=v3DeliveryPlan(fs.readFileSync(file,'utf8').split(/\r?\n/));
 const field=process.argv.find(a=>a.startsWith('--field='))?.slice(8);
 if(field){if(!['target','risk','reason','hold'].includes(field))throw Error('Unsupported field');console.log(String(plan[field]));}
 else {
  if(process.env.GITHUB_OUTPUT){
   for(const key of ['target','risk','hold','reason'])fs.appendFileSync(process.env.GITHUB_OUTPUT,key+'='+String(plan[key])+'\n');
   fs.appendFileSync(process.env.GITHUB_OUTPUT,'test_paths='+plan.tests.join(' ')+'\n');
  }
  console.log(JSON.stringify(plan));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n### GMWW AUTO-DELIVERY V3.0\n\nTarget: '+plan.target+' | Risk: '+plan.risk+' | Hold: '+plan.hold+'\n\n'+plan.files.length+' changed file(s).\n');
 }
}
