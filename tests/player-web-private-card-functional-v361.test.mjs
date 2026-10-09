import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
const start=script.indexOf('const PLAYER_PRIVATE_CARD_IDLE_MS=30000;');
const end=script.indexOf('function syncPlayerPresentation(){',start);
assert.ok(start>0&&end>start,'Patched card viewer helpers exist');
const helpers=script.slice(start,end);

function createHarness(){
 let now=0,nextId=1;
 const timers=new Map(),operations=[];
 const game={dataset:{privateCardView:'closed'}};
 const roleCard={classList:{remove:token=>operations.push('role-remove:'+token)}};
 const artifactCard={classList:{remove:token=>operations.push('artifact-remove:'+token)}};
 const context={
  state:{roomCode:'ROOM01',participantId:'member:safari',role:{roleId:'seer'},artifact:{artifactId:'amulet'},
   room:{phase:'role_delivery'},roleOpen:false,artifactOpen:false,artifactFocus:''},
  playerScenePolicy:room=>({rolesReleased:room.phase==='role_delivery'||room.phase==='running'}),
  '$':selector=>selector==='#game'?game:selector==='#roleCard'?roleCard:selector==='#artifactCard'?artifactCard:null,
  setTimeout(fn,ms){const id=nextId++;timers.set(id,{fn,at:now+ms});return id},
  clearTimeout(id){timers.delete(id)},
  Date:{now:()=>now},
  clearRolePrivacyTimer(){operations.push('clearRoleTimer')},
  setGameViewPane(pane){operations.push('pane:'+pane);game.dataset.privateCardView=pane==='role'?'open':'closed'},
  renderRole(){operations.push('renderRole')},
  toggleRole(){operations.push('toggleRole');context.state.roleOpen=true},
  toggleArtifact(){operations.push('toggleArtifact');context.state.artifactOpen=true}
 };
 vm.runInNewContext(helpers+'\nthis.api={allowed:privateCardAllowed,open:openPrivateCardViewer,close:closePrivateCardViewer,renew:armPrivateCardIdle};',context);
 function elapse(ms){
  const target=now+ms;
  while(true){
   let next=null,id;
   for(const [k,t] of timers)if(t.at<=target&&(!next||t.at<next.at)){next=t;id=k}
   if(!next)break;
   now=next.at;timers.delete(id);next.fn();
  }
  now=target;
 }
 return {api:context.api,state:context.state,game,operations,timers,elapse,now:()=>now};
}

test('Role card opens from face down and automatically flips closed at exactly 30 seconds',()=>{
 const h=createHarness();
 assert.equal(h.api.allowed(),true);
 h.api.open('role');
 assert.deepEqual(h.operations.filter(x=>x==='toggleRole'||x==='toggleArtifact'),['toggleRole']);
 assert.equal(h.game.dataset.privateCardView,'open');
 assert.equal(h.state.roleOpen,true);
 h.elapse(29999);
 assert.equal(h.state.roleOpen,true);
 assert.equal(h.game.dataset.privateCardView,'open');
 h.elapse(1);
 assert.equal(h.state.roleOpen,false);
 assert.equal(h.state.artifactOpen,false);
 assert.equal(h.game.dataset.privateCardView,'closed');
 assert.equal(h.timers.size,0,'no lingering timer after closure');
});

test('Artifact card gets same 30-second idle protection, never opening an unassigned artifact',()=>{
 const h=createHarness();
 h.state.artifact=null;
 h.api.open('artifact');
 assert.equal(h.game.dataset.privateCardView,'closed');
 h.state.artifact={artifactId:'amulet'};
 h.api.open('artifact');
 assert.ok(h.operations.includes('toggleArtifact'));
 assert.equal(h.state.artifactOpen,true);
 h.elapse(30000);
 assert.equal(h.state.artifactOpen,false);
 assert.equal(h.game.dataset.privateCardView,'closed');
});

test('Any interaction restarts the 30-second idle period rather than ending an active inspection',()=>{
 const h=createHarness();
 h.api.open('role');
 h.elapse(20000);
 h.api.renew();
 h.elapse(10000);
 assert.equal(h.game.dataset.privateCardView,'open','opening should not close 30 seconds after first tap if later activity occurred');
 h.elapse(19999);
 assert.equal(h.game.dataset.privateCardView,'open');
 h.elapse(1);
 assert.equal(h.game.dataset.privateCardView,'closed');
});

test('GM must release role to authenticated participant before dock can open',()=>{
 const h=createHarness();
 h.state.room.phase='lobby';
 assert.equal(h.api.allowed(),false);
 h.api.open('role');
 assert.equal(h.game.dataset.privateCardView,'closed');
 h.state.room.phase='role_delivery';h.state.participantId=null;
 assert.equal(h.api.allowed(),false);
 h.state.participantId='member:safari';h.state.role=null;
 assert.equal(h.api.allowed(),false);
});

test('Manual closure always flips both cards and cancels idle countdown',()=>{
 const h=createHarness();
 h.api.open('role');
 h.state.artifactOpen=true;
 h.elapse(4000);
 h.api.close();
 assert.equal(h.state.roleOpen,false);
 assert.equal(h.state.artifactOpen,false);
 assert.equal(h.game.dataset.privateCardView,'closed');
 h.elapse(60000);
 assert.equal(h.game.dataset.privateCardView,'closed');
 assert.equal(h.timers.size,0);
});
