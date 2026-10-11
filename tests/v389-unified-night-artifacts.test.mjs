import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("server-game/current/battle-controls.js","utf8");
const context=vm.createContext({});
vm.runInContext(source,context);
const controls=context.GMWW_BATTLE_CONTROLS;
const catalog={
  cards:[{id:"seer",name:"Tiên Tri",functions:[{id:"vision",actionId:"inspect",targetCount:1}]}],
  artifacts:[
    {id:"mirror",name:"Tráng Gương",functions:[{id:"copy",actionId:"mirror_copy",targetCount:1}]},
    {id:"stone",name:"Đá Đổi Vai Trò",functions:[{id:"swap",actionId:"stone_swap",targetCount:2}]}
  ],
  actions:[
    {id:"inspect",name:"Soi"},
    {id:"mirror_copy",name:"Tráng Gương"},
    {id:"stone_swap",name:"Đổi Vai Trò"}
  ]
};
const owner=(artifactId,loginId)=>({artifactId,loginId,playerId:"member:"+loginId});
const used=[{artifactId:"mirror",playerId:"member:alice"}];

test("early Artifact window has no actions when none are assigned",()=>{
  assert.equal(controls.actionsForTurn({kind:"early-artifact-window",actions:[]},1,catalog).length,0);
});
test("early Artifact window shows configured actions and skips used owners",()=>{
  const turn={kind:"early-artifact-window",actions:[owner("mirror","alice"),owner("stone","bob")]};
  const actions=controls.actionsForTurn(turn,1,catalog,used);
  assert.equal(actions.length,1);
  assert.equal(actions[0].name,"Đổi Vai Trò");
  assert.equal(actions[0].artifactId,"stone");
  assert.equal(actions[0].actorIds[0],"bob");
  assert.equal(actions[0].targetCount,2);
});
test("role turn keeps role actions and combines unused owned Artifact actions",()=>{
  const turn={kind:"role",roleId:"seer",loginIds:["alice"],artifacts:[owner("mirror","alice"),owner("stone","alice")]};
  const actions=controls.actionsForTurn(turn,1,catalog,used);
  assert.deepEqual(Array.from(actions,x=>x.name),["Soi","Đổi Vai Trò"]);
  assert.equal(actions[0].artifactId,undefined);
  assert.equal(actions[1].artifactId,"stone");
  assert.equal(actions[1].actorIds[0],"alice");
});
test("night timeline does not duplicate final village-wakeup step",()=>{
  const runtime={queue:[{id:"wolf",kind:"wolf-introduction",label:"Bầy Sói"},{id:"first",kind:"early-artifact-window",label:"Artifact đầu ván",actions:[]},{id:"end",kind:"village-wakeup",label:"Làng ơi dậy đi"}],cursor:1,completed:false};
  assert.deepEqual(Array.from(controls.timeline("night",runtime,2),x=>x.kind),["wolf-introduction","early-artifact-window","village-wakeup"]);
});
test("server checks Artifact ownership and manual GM final turn triggers morning",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const gm=fs.readFileSync("server-game/current/app.js","utf8");
  assert.match(worker,/claimedActor&&normalizeLoginId\(x\.loginId\)===claimedActor/);
  assert.match(worker,/step\.kind==="role"\&\&body\.artifactId/);
  assert.match(worker,/runtime\.completed\?await this\.applyCycle\(meta,"morning"/);
  assert.match(gm,/artifactId:a\.artifactId/);
});
test('real categorized action catalog resolves Vietnamese names separately for role and Artifact',()=>{
  const real={...catalog,actions:{role:[{id:'inspect',name:'Soi Vai Trò'}],artifacts:[{id:'stone_swap',name:'Đổi Vai Trò'}]}};
  const actions=controls.actionsForTurn({kind:'role',roleId:'seer',loginIds:['alice','bob'],artifacts:[owner('stone','alice'),owner('stone','bob')]},1,real);
  assert.deepEqual(Array.from(actions,x=>x.name),['Soi Vai Trò','Đổi Vai Trò','Đổi Vai Trò']);
  assert.notEqual(actions[1].id,actions[2].id);
  assert.equal(actions[1].artifactLoginId,'alice');assert.equal(actions[2].artifactLoginId,'bob');
});
