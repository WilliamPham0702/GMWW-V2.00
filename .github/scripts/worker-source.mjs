// Gộp mã nguồn Worker (src/index.js + src/worker/**) lại thành MỘT module, đúng hình dạng
// src/index.js trước khi tách: import bên ngoài → hằng số → class RoomDurableObject (các nhóm
// phương thức theo thứ tự ghép) → export default (router) → các hàm hỗ trợ.
// Các bài test kiểm tra văn bản nguồn (match / indexOf / slice rồi chạy thử) đọc qua hàm này,
// nên không phụ thuộc việc một hàm đang nằm ở file nào trong src/worker/.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(root,'src');
const WORKER=path.join(SRC,'worker');
const read=file=>fs.readFileSync(file,'utf8');
const IMPORT=/^import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}\s*)?(?:\*\s*as\s+([\w$]+)\s*)?from\s*["']([^"']+)["'];?[ \t]*\n?/gm;
const SIDE_EFFECT_IMPORT=/^import\s*["']([^"']+)["'];?[ \t]*\n?/gm;

function listModules(dir){
  return fs.readdirSync(path.join(WORKER,dir)).filter(name=>name.endsWith('.js')).sort().map(name=>path.join(WORKER,dir,name));
}

// File nguồn của Worker theo thứ tự gộp (đường dẫn tính từ gốc repo).
export function workerSourceFiles(){
  const roomClass=path.join(WORKER,'room/room-durable-object.js');
  const groups=[...read(roomClass).matchAll(/^import \{ Room\w+Methods \} from "\.\/([\w-]+\.js)";$/gm)].map(m=>path.join(WORKER,'room',m[1]));
  const router=path.join(WORKER,'http/router.js');
  return [path.join(SRC,'index.js'),roomClass,...groups,router,
    ...listModules('support'),...listModules('http').filter(file=>file!==router)].map(file=>path.relative(root,file).split(path.sep).join('/'));
}

export function workerSource(){
  const external=new Map(); // nguồn import (tính từ src/) → {names, defaultName, namespace, bare}
  const note=(file,spec)=>{
    if(!spec.startsWith('.'))return spec;
    const target=path.resolve(path.dirname(file),spec);
    if(target.startsWith(WORKER+path.sep))return null; // import nội bộ giữa các phần của Worker
    const rel=path.relative(SRC,target).split(path.sep).join('/');
    return rel.startsWith('.')?rel:'./'+rel;
  };
  const entry=source=>{
    if(!external.has(source))external.set(source,{names:[],defaultName:'',namespace:'',bare:false});
    return external.get(source);
  };
  const strip=file=>read(file).replace(IMPORT,(_,defaultName,names,namespace,spec)=>{
    const source=note(file,spec);
    if(source){
      const row=entry(source);
      if(defaultName)row.defaultName=defaultName;
      if(namespace)row.namespace=namespace;
      for(const name of String(names||'').split(',').map(x=>x.trim()).filter(Boolean))if(!row.names.includes(name))row.names.push(name);
    }
    return '';
  }).replace(SIDE_EFFECT_IMPORT,(_,spec)=>{
    const source=note(file,spec);
    if(source)entry(source).bare=true;
    return '';
  });
  const plain=file=>strip(file).replace(/^export (?=(?:async )?function |const |let |class )/gm,'');
  const files=workerSourceFiles().map(file=>path.join(root,file));
  const [index,roomClass,...rest]=files;
  const router=path.join(WORKER,'http/router.js');
  const groups=rest.filter(file=>path.dirname(file)===path.join(WORKER,'room'));
  const helpers=rest.filter(file=>file!==router&&!groups.includes(file));

  const constants=strip(index).split('\n').filter(line=>/^const /.test(line)).join('\n');
  const methods=groups.map(file=>{
    const text=strip(file);
    const open=text.search(/^export class \w+Methods \{\n/m);
    const close=text.lastIndexOf('\n}');
    if(open<0||close<0)throw new Error('Nhóm phương thức sai định dạng: '+file);
    return text.slice(text.indexOf('\n',open)+1,close);
  }).join('\n');
  strip(roomClass);
  const body=[constants,
    'export class RoomDurableObject extends DurableObject {\n'+methods+'\n}',
    strip(router).replace(/^\/\/ [^\n]*\n/,''),
    ...helpers.map(plain)].join('\n\n');
  const imports=[...external].map(([source,row])=>{
    if(row.namespace)return 'import * as '+row.namespace+' from "'+source+'";';
    const head=[row.defaultName,row.names.length?'{'+row.names.join(',')+'}':''].filter(Boolean).join(',');
    return head?'import '+head+' from "'+source+'";':'import "'+source+'";';
  }).join('\n');
  return imports+'\n'+body+'\n';
}

// Mã của một module trong src/worker/ (ví dụ 'http/player-room-api.js'), đã bỏ import và export,
// để bài test trích hàm thật ra chạy thử mà không phụ thuộc thứ tự gộp.
export function workerModuleSource(name){
  return read(path.join(WORKER,name)).replace(IMPORT,'').replace(SIDE_EFFECT_IMPORT,'')
    .replace(/^export (?=(?:async )?function |const |let |class )/gm,'');
}
