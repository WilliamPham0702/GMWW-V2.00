#!/usr/bin/env node
// Worker-only delivery must not change the Runtime. Before it embeds the OTA catalog it proves that
// the package rebuilt from this commit is the SAME package already published on GitHub for this
// version: same identity fields and the same path + SHA-256 + URL for every file.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const IDENTITY=['releaseVersion','runtimeVersion','shellVersion','minimumShellVersion','releaseType'];

export function verifyPublishedRuntimeCatalog(candidate,published){
  for(const [label,m] of [['candidate',candidate],['published',published]]){
    if(!m||typeof m!=='object'||!Array.isArray(m?.runtime?.files)||!m.runtime.files.length)
      throw new Error('Runtime manifest ('+label+') has no file inventory');
    if(String(m.releaseType)!=='runtime')throw new Error('Runtime manifest ('+label+') is not a runtime release');
    if(Array.isArray(m.delete)&&m.delete.length)throw new Error('Runtime manifest ('+label+') deletes files');
  }
  for(const key of IDENTITY)
    if(String(candidate[key]??'')!==String(published[key]??''))
      throw new Error('Runtime '+key+' differs from the published package: '+candidate[key]+' vs '+published[key]);
  const inventory=m=>{
    const rows=new Map();
    for(const f of m.runtime.files){
      const path=String(f?.path||''),sha=String(f?.sha256||'').toLowerCase();
      if(!path||!/^[a-f0-9]{64}$/.test(sha)||rows.has(path))throw new Error('Invalid Runtime inventory entry: '+path);
      rows.set(path,sha+' '+String(f?.url||''));
    }
    return rows;
  };
  const a=inventory(candidate),b=inventory(published);
  const diff=[...new Set([...a.keys(),...b.keys()])].filter(path=>a.get(path)!==b.get(path)).sort();
  if(diff.length)throw new Error('Runtime package differs from the published V'+published.releaseVersion+' in '+diff.length+' file(s): '+diff.slice(0,8).join(', '));
  return {version:String(candidate.releaseVersion),files:a.size};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const [candidateFile,publishedFile]=process.argv.slice(2);
  if(!candidateFile||!publishedFile)throw new Error('Usage: verify-published-runtime-catalog.mjs <candidate manual-manifest.json> <published manual-manifest.json>');
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const result=verifyPublishedRuntimeCatalog(read(candidateFile),read(publishedFile));
  console.log('Runtime catalog matches the published package: V'+result.version+', '+result.files+' files.');
}
