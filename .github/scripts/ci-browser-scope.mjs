#!/usr/bin/env node
// Select the smallest SAFE browser scope on PRs. Unknown diffs run the full suite.
// Production/main and manual release checks ALWAYS run the full browser suite.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scopedMarkers={
  'src/index.js':['  async gmConfig(request,body){','  async gmDayClock(request,body){'],
  'src/gmww-public-room-contract.js':['export function publicRoom(m){',null],
  'server-game/src/50-roles-and-artifacts.part':['/* Match completion is shared','async function openPlayEndSheet(){'],
  'server-game/current/app.js':['/* Match completion is shared','async function openPlayEndSheet(){']
};
const testPath=/^tests\/(?:match-completion(?:-server|-reentry)?|forced-end-game)\.test\.mjs$/;
const notesPath=/^docs\/releases\/[\w.\-]+\.md$/;

function outsideScope(source,startMarker,endMarker){
  if(typeof source!=='string')return null;
  const start=source.indexOf(startMarker);
  if(start<0||source.indexOf(startMarker,start+1)!==-1)return null;
  const end=endMarker?source.indexOf(endMarker,start+startMarker.length):source.length;
  if(end<0||endMarker&&source.indexOf(endMarker,end+1)!==-1)return null;
  return source.slice(0,start)+'\n/* verified scoped change */\n'+source.slice(end);
}

export function classifyBrowserScope(changes){
  if(!Array.isArray(changes)||!changes.length)return 'full';
  for(const {path,before,after,status} of changes){
    if(!path||!['M','A'].includes(status))return 'full';
    if(notesPath.test(path)||testPath.test(path))continue;
    const markers=scopedMarkers[path];
    if(!markers||status!=='M')return 'full';
    const oldOutside=outsideScope(before,...markers),newOutside=outsideScope(after,...markers);
    if(oldOutside===null||newOutside===null||oldOutside!==newOutside)return 'full';
  }
  return 'postgame';
}

function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024})}
function detect(){
  if(process.env.GMWW_CI_EVENT!=='pull_request')return {mode:'full',reason:'Full CI mandatory on main/manual release'};
  const base=String(process.env.GMWW_CI_BASE_SHA||'').trim();
  if(!/^[0-9a-f]{40}$/i.test(base))return {mode:'full',reason:'No verified PR base SHA'};
  try{
    const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
    if(!rows.length)return{mode:'full',reason:'Empty/unknown PR diff'};
    const changes=rows.map(line=>{
      const [status,path]=line.split('\t');
      const before=status==='M'?git('show',base+':'+path):null;
      const after=status==='M'||status==='A'?fs.readFileSync(path,'utf8'):null;
      return{status,path,before,after};
    });
    return{mode:classifyBrowserScope(changes),reason:changes.map(c=>c.path).join(', ')};
  }catch(error){
    return{mode:'full',reason:'Could not verify changes safely: '+String(error.message||error)};
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const result=detect();
  console.log('GMWW browser CI scope: '+result.mode+' | '+result.reason);
  if(result.mode==='postgame')console.log('Bỏ qua kiểm thử lá bài / 30 ghế / realtime nặng; chỉ chạy hồi quy kết thúc ván. Production vẫn kiểm thử toàn diện.');
  else console.log('Phạm vi chưa được chứng minh an toàn hoặc đang phát hành: chạy toàn bộ kiểm thử.');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Phạm vi CI: '+result.mode+'\n'+result.reason+'\n');
}
