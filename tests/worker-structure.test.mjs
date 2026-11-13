import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {workerSourceFiles,workerSource} from '../.github/scripts/worker-source.mjs';

const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);

test('every Worker module is part of the combined Worker source',()=>{
  const listed=new Set(workerSourceFiles());
  const glue=new Set(['src/worker/config.js','src/worker/room/compose.js']);
  for(const file of walk('src/worker').filter(f=>f.endsWith('.js')).map(f=>f.split(path.sep).join('/')))
    assert.ok(listed.has(file)||glue.has(file),file+' is not reachable from room-durable-object.js, http/ or support/');
});

test('room method groups never define the same method twice',()=>{
  const seen=new Map();
  for(const file of workerSourceFiles().filter(f=>f.startsWith('src/worker/room/')&&!f.endsWith('room-durable-object.js'))){
    for(const m of fs.readFileSync(file,'utf8').matchAll(/^  (?:async )?([A-Za-z_$][\w$]*)\(/gm)){
      assert.equal(seen.has(m[1]),false,m[1]+' is defined in '+file+' and '+seen.get(m[1]));
      seen.set(m[1],file);
    }
  }
  assert.ok(seen.size>150);
});

test('entry module only wires configuration, the room class and the router',()=>{
  const entry=fs.readFileSync('src/index.js','utf8');
  assert.match(entry,/^const PROJECT="GMWW-V2\.00",VERSION="V[0-9.]+",NATIVE_SHELL_VERSION="[0-9.]+"/m);
  assert.match(entry,/export \{ RoomDurableObject \} from "\.\/worker\/room\/room-durable-object\.js";/);
  assert.match(entry,/export \{ default \} from "\.\/worker\/http\/router\.js";/);
  assert.doesNotMatch(entry,/\bfunction\b|\bclass\b/);
  assert.match(workerSource(),/export class RoomDurableObject extends DurableObject \{/);
});
