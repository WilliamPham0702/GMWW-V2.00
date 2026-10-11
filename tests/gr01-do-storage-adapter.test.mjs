import test from 'node:test';import assert from 'node:assert/strict';
import {exportDoStorage,restoreDoStorage} from '../tools/gr01-do-storage-adapter.mjs';
class FakeDoStorage{
 constructor(data=[]){this.data=new Map(data)}
 async list(){return new Map(this.data)}
 async get(k){return this.data.get(k)}
 async put(k,v){this.data.set(k,v)}
}
test('DO storage interface exports and verifies isolated restore',async()=>{
 const source=new FakeDoStorage([['meta',{phase:'night'}],['players',[{id:'a'}]],['artifactUse:1',{used:true}]]);
 const backup=await exportDoStorage(source,{environment:'gr01-isolated-staging',instanceId:'fixture-room'});
 const dest=new FakeDoStorage();await restoreDoStorage(backup,dest,{environment:'gr01-isolated-staging'});
 assert.equal((await dest.list()).size,0);
 assert.deepEqual(await restoreDoStorage(backup,dest,{environment:'gr01-isolated-staging',dryRun:false}),{count:3,dryRun:false,verified:true});
 assert.deepEqual(await dest.list(),await source.list());
});
test('production environment blocked',async()=>{await assert.rejects(()=>exportDoStorage(new FakeDoStorage(),{environment:'production',instanceId:'x'}),/Only isolated/);await assert.rejects(()=>restoreDoStorage({},new FakeDoStorage(),{environment:'production'}),/Only isolated/)});
test('nonempty target rejected',async()=>{const b=await exportDoStorage(new FakeDoStorage([['meta',1]]),{environment:'gr01-isolated-staging',instanceId:'x'});await assert.rejects(()=>restoreDoStorage(b,new FakeDoStorage([['existing',1]]),{environment:'gr01-isolated-staging',dryRun:false}),/empty/)});
