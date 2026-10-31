import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
await import('../server-game/current/battle-controls.js');

const gm=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const chat=readFileSync('server-game/src/45-online-chat.part','utf8');
const server=readFileSync('src/index.js','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const slice=(s,a,b)=>{
 const start=s.indexOf(a),end=s.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,'Found '+a);
 return s.slice(start,end);
};

test('PACK-01 always offers one authorized Wolf Bite action',()=>{
 const action=globalThis.GMWW_BATTLE_CONTROLS.actionsForTurn({
   kind:'wolf-pack-bite',id:'wolf-pack-bite',
   loginIds:['wolf1','wolf2'],biteActorIds:['wolf1','wolf2'],
   roles:[{roleId:'role_wolf',loginIds:['wolf1']},{roleId:'role_alpha_wolf',loginIds:['wolf2']}]
 },1,{},[]);
 assert.equal(action.length,1);
 assert.equal(action[0].actionId,'action_wolf_bite');
 assert.deepEqual(action[0].actorIds,['wolf1','wolf2']);
 const source=slice(gm,'function battleIconResolve(action){','function battleIconPositionKey(');
 const scope={globalThis:{},console};
 vm.createContext(scope);vm.runInContext(source+'globalThis.resolve=battleIconResolve;',scope);
 const fallback=scope.globalThis.resolve(action[0]);
 assert.equal(fallback.length,1);
 assert.equal(fallback[0].assetId,'05_soi_can.png');
 scope.globalThis.GMWWActionIconLibrary={resolveAll(){return[]}};
 assert.equal(scope.globalThis.resolve(action[0])[0].assetId,'05_soi_can.png');
});

test('Action icons spawn at the real campfire and remain independently movable',()=>{
 const source=slice(gm,'function battleIconEntryPoint(){','function battleIconResetPositions(){');
 const fire={getBoundingClientRect(){return {left:100,top:220,width:50,height:60}}};
 const scope={document:{querySelector(q){return q.includes('play-village-core')?fire:null}},
   battleIconClamp:(x,y)=>({x,y}),globalThis:{},innerWidth:390,innerHeight:844};
 vm.createContext(scope);
 vm.runInContext(source+'globalThis.entry=battleIconEntryPoint;',scope);
 assert.deepEqual(scope.globalThis.entry(),{x:125,y:250});
 assert.match(gm,/battleIconPositions\.set\(key,point\)/);
 assert.match(gm,/pointermove/);
 assert.match(gm,/battleIconTargetAt\(e\.clientX,e\.clientY,a\)/);
});

function undoHarness({changed=false,cycle='night-1',cursor=2}={}){
 const meta={phase:'running',cyclePhase:'night',cycleKey:cycle,cycleNight:1,matchId:'m1',demo:false,currentNightTurnId:'seer'};
 const runtime={cursor,completed:false,queue:[
   {id:'intro'},{id:'wolf-pack-bite'},{id:'seer'}
 ]};
 const before=[],after=[{type:'effect_notice',loginId:'villager'}];
 const record={token:'undo-token',matchId:'m1',cycleKey:'night-1',night:1,
   turnId:'wolf-pack-bite',label:'Sói Cắn',targetIds:['villager'],
   before:[{key:'interactions',exists:true,value:before}],
   after:[{key:'interactions',exists:true,value:after}],undone:false};
 const data=new Map([
   ['battleLastAction:m1',record],
   ['interactions',changed?[...after,{type:'dead',loginId:'another'}]:after],
   ['players',{}]
 ]);
 const log=[],rewinds=[];
 const start=server.indexOf('  async gmBattleUndo(request,body){');
 const end=server.indexOf('  async gmInteraction(request,body){',start);
 assert.ok(start>=0&&end>start);
 const Room=vm.runInNewContext('(class Room{'+server.slice(start,end)+'})',{
   Date,crypto:{randomUUID:()=> 'test-uuid'},
   j:(v,status=200)=>({...v,status}),
   publicRoom:m=>m,publicPlayer:p=>p
 });
 const room=new Room();
 room.ctx={storage:{
   get:async key=>data.get(key),put:async(key,value)=>{data.set(key,value);return true},
   delete:async key=>{data.delete(key);return true}
 }};
 room.gmAuthorized=async()=>({ok:true,meta});
 room.getNightRuntime=async()=>runtime;
 room.advanceNightRuntime=async(_meta,action,source,index)=>{rewinds.push({action,source,index});runtime.cursor=index};
 room.broadcast=event=>log.push(event);
 return {room,data,rewinds,log};
}

test('Undo safely rewinds Wolf Bite after automatic next-turn navigation',async()=>{
 const {room,data,rewinds,log}=undoHarness();
 const response=await room.gmBattleUndo({}, {undoToken:'undo-token'});
 assert.equal(response.ok,true);
 assert.equal(response.undone,true);
 assert.equal(data.get('interactions').length,0);
 assert.equal(data.get('battleLastAction:m1').undone,true);
 assert.deepEqual(rewinds,[{action:'jump',source:'gm-undo',index:1}]);
 assert.ok(log.some(x=>x.type==='battle_action_undone'));
});

test('Undo refuses a later interaction or a different night without overwriting data',async()=>{
 const changed=undoHarness({changed:true});
 const rejected=await changed.room.gmBattleUndo({}, {undoToken:'undo-token'});
 assert.equal(rejected.error,'UNDO_STATE_CHANGED');
 assert.equal(changed.data.get('interactions').length,2);
 assert.equal(changed.rewinds.length,0);
 const stale=undoHarness({cycle:'night-2'});
 const expired=await stale.room.gmBattleUndo({}, {undoToken:'undo-token'});
 assert.equal(expired.error,'UNDO_STALE_TURN');
 assert.equal(stale.rewinds.length,0);
});

test('GM Chat monitor remains authorized and accessible from Seat setup',()=>{
 assert.match(chat,/function gmwwGMChatAvailable\(\)/);
 for(const step of ["'seats'","'game'","'roles'","'deal'","'battle'"])
   assert.ok(chat.includes(step));
 assert.match(chat,/trigger\.hidden=!\(active&&playSceneState\.step!=='battle'\)/);
 assert.match(chat,/if\(!gmwwGMChatOpen\|\|!gmwwGMChatAvailable\(\)\)return/);
 assert.match(server,/async gmChatRead\(request\)\{\s*const auth=await this\.gmAuthorized\(request\)/);
 assert.match(chat,/playRoomApi\('\/chat',\{method:'GET'\}\)/);
});

test('Function result popup is positioned just beneath GM top dock',()=>{
 const source=slice(gm,'function battleShowResultPopup(', '/* Morning notices');
 const popup={hidden:true,offsetHeight:90,style:{},dataset:{},
   classList:{toggle(){}}};
 const elements={battleResultPopup:popup,battleResultTitle:{},
   battleResultMessage:{},playBattleDock:{
     getBoundingClientRect:()=>({top:20,bottom:100,height:80})
   }};
 const context={document:{getElementById:id=>elements[id]||null},
   battleState:{key:'night:1'},globalThis:{visualViewport:{height:740,offsetTop:0}},
   innerHeight:740,String};
 vm.createContext(context);
 vm.runInContext(source+'globalThis.show=battleShowResultPopup;',context);
 context.globalThis.show('KẾT QUẢ','Đã xử lý',false);
 assert.equal(popup.hidden,false);
 assert.equal(popup.style.top,'108px');
 assert.ok(app.includes('const wanted=bounds.bottom+8'));
});

test('Packaged runtime exactly matches all seven GM source modules',()=>{
 const names=['00-core-and-library.part','10-library-and-settings.part',
  '20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part',
  '45-online-chat.part','50-roles-and-artifacts.part'];
 assert.equal(names.map(n=>readFileSync('server-game/src/'+n,'utf8')).join(''),app);
});
