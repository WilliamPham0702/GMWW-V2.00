import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomGameTemplateMethods } from '../src/worker/room/game-templates.js';

test('GM quick-play defaults survive pruning and remain unique by player count', async () => {
  const data = new Map();
  const store = new RoomGameTemplateMethods();
  store.ctx = {storage: {
    get: async key => data.get(key),
    put: async (key, value) => {
      for (const [k, v] of typeof key === 'string' ? [[key, value]] : Object.entries(key)) data.set(k, v);
    },
    list: async ({prefix}) => new Map([...data].filter(([key]) => key.startsWith(prefix))),
    delete: async key => data.delete(key)
  }};
  const save = (id, count, quickPlayDefault) => store.gameTemplateUpsert({
    id, quickPlayDefault,
    gameConfig: {playerCount: count, roles: [{roleId: 'wolf', count: 1}, {roleId: 'villager', count: count - 1}]}
  });
  for (let count = 5; count <= 10; count++) assert.ok((await save('gm-' + count, count, true)).ok);
  await save('replacement', 5, true);
  await save('gm-6', 6);
  const {templates} = await (await store.gameTemplateList()).json();
  const defaults = templates.filter(template => template.quickPlayDefault);
  assert.deepEqual(defaults.map(template => template.playerCount).sort((a, b) => a - b), [5, 6, 7, 8, 9, 10]);
  assert.equal(defaults.find(template => template.playerCount === 5).id, 'replacement');
  assert.equal((await save('invalid', 0, true)).status, 400);
});

test('Quick Play V2 preserves a large collection of different GM templates instead of auto-deleting all but five',async()=>{
 const data=new Map(),store=new RoomGameTemplateMethods();
 store.ctx={storage:{
   get:async key=>data.get(key),
   put:async(key,value)=>{for(const [k,v] of typeof key==='string'?[[key,value]]:Object.entries(key))data.set(k,v)},
   list:async({prefix})=>new Map([...data].filter(([key])=>key.startsWith(prefix))),
   delete:async key=>data.delete(key)
 }};
 for(let i=1;i<=12;i++){
   const out=await store.gameTemplateUpsert({id:'quick-alt-'+i,gameConfig:{
     name:'Bộ vai '+i,playerCount:5,roles:[{roleId:'wolf',count:1},{roleId:'villager',count:4}]
   }});
   assert.equal(out.status,200);
 }
 const list=await (await store.gameTemplateList()).json();
 assert.equal(list.count,12);
 for(let i=1;i<=12;i++)assert.ok(list.templates.some(t=>t.id==='quick-alt-'+i));
});
