#!/usr/bin/env node
// GMWW AUTO-DELIVERY V3.0: deterministic, fail-closed scope classification.
import fs from 'node:fs';
const playerTests=['tests/player-web-v3-iframe-drag.test.mjs','tests/player-web-online-actions-20261028.test.mjs','tests/online-player-fire-turn-dead-ui-20261031.test.mjs','tests/player-web-wolf-ballots-20261101.test.mjs'];
const sharedTests=['tests/gmww-play-interaction-rules.test.mjs','tests/online-chat-authority.test.mjs'];
function category(path){
  if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').includes('..'))return 'blocked';
  if(/(^|\/)(arena-3d|3d)(\/|$)/i.test(path))return 'frozen';
  if(/^server-game\/(GMWW-Server\/|GMWW-Server\.xcodeproj\/)/.test(path)||/\.swift$|\.entitlements$|Info\.plist$/.test(path))return 'native';
  if(['wrangler.jsonc','package.json','package-lock.json'].includes(path))return 'blocked';
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
 if(types.has('blocked')||types.has('frozen')||types.has('native'))
   return {target:'blocked',risk:'critical',hold:true,files,tests:sharedTests,reason:types.has('frozen')?'frozen-3d':types.has('native')?'native-requires-separate-release':'unrecognized-or-sensitive-scope'};
 const deployTypes=[...types].filter(t=>t!=='ci');
 if(deployTypes.length>1)return {target:'blocked',risk:'critical',hold:true,files,tests:sharedTests,reason:'mixed-deployment-targets'};
 const target=deployTypes[0]||'none';
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
