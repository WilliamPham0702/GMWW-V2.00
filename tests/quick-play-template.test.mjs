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


test('shared Ván Mẫu library stores at most 20 without pruning defaults or artwork', async () => {
  const data = new Map();
  const store = new RoomGameTemplateMethods();
  store.ctx = {storage: {
    get: async key => data.get(key),
    put: async (key, value) => {
      for (const [k, v] of typeof key === 'string' ? [[key, value]] : Object.entries(key)) data.set(k, v);
    },
    list: async ({prefix}) => new Map([...data].filter(([key]) => key.startsWith(prefix))),
    delete: async keys => {for (const key of Array.isArray(keys) ? keys : [keys]) data.delete(key)}
  }};
  const compiledConfig = {name:'Ván kiểm thử',playerCount:6,roles:[{roleId:'wolf',count:1},{roleId:'villager',count:5}]};
  const saveGM = (id, quickPlayDefault=false) => store.gameTemplateUpsert({id,quickPlayDefault,gameConfig:compiledConfig});
  for (let i=1;i<=19;i++) assert.equal((await saveGM('gm-'+i,i===1)).status,200);
  const playerSaved=await store.gameTemplatePlayerSave({ownerLoginId:'player-one',compiledConfig});
  assert.equal(playerSaved.status,200);
  const playerId=(await playerSaved.json()).template.id;
  assert.equal((await (await store.gameTemplateList()).json()).count,20);

  // Rejected saves do not overwrite or silently delete any existing template or artwork.
  data.set('gameTemplateAsset:gm-1:role:wolf',{package:'preserve'});
  const rejectedGM=await saveGM('gm-21');
  assert.equal(rejectedGM.status,409);
  assert.equal((await rejectedGM.json()).error,'TEMPLATE_LIMIT_REACHED');
  const rejectedPlayer=await store.gameTemplatePlayerSave({ownerLoginId:'player-two',compiledConfig});
  assert.equal(rejectedPlayer.status,409);
  assert.equal(data.has('gameTemplate:gm-1'),true);
  assert.equal(data.get('gameTemplateAsset:gm-1:role:wolf').package,'preserve');
  assert.equal(data.get('gameTemplate:gm-1').quickPlayDefault,true);
  assert.equal((await (await store.gameTemplateList()).json()).count,20);

  // Editing existing GM and PLAYER entries does not consume a new slot.
  assert.equal((await saveGM('gm-2')).status,200);
  assert.equal((await store.gameTemplatePlayerSave({id:playerId,ownerLoginId:'player-one',compiledConfig})).status,200);
  assert.equal((await (await store.gameTemplateList()).json()).count,20);

  // Only explicit deletion opens a slot for another template.
  assert.equal((await store.gameTemplateDelete('gm-19')).status,200);
  assert.equal((await saveGM('gm-21')).status,200);
  assert.equal((await (await store.gameTemplateList()).json()).count,20);
});
