import test from 'node:test';
import assert from 'node:assert/strict';
import {ghostLetterTarget,ghostLetterContent,ghostLetterResponse} from '../src/gmww-ghost-letter.js';
const matchId='match',actorId='alice',targetId='bob';
const dead=[{loginId:'bob',type:'dead',night:1,matchId,effectActive:true}];
test('#34 targets only a player eliminated in preceding day/night cycle',()=>{
 assert.equal(ghostLetterTarget({actorId,targetId,matchId,day:2,interactions:dead}).ok,true);
 for(const v of [{targetId:'alice'},{day:1},{day:3},
   {interactions:[{...dead[0],effectActive:false}]},
   {interactions:[{...dead[0],matchId:'another'}]}])
  assert.equal(ghostLetterTarget({actorId,targetId,matchId,day:2,interactions:dead,...v}).ok,false);
});
test('#34 takes exactly one Unicode letter, never a word or punctuation',()=>{
 assert.equal(ghostLetterContent('Đ').ok,true);
 assert.equal(ghostLetterContent('ấ').ok,true);
 assert.equal(ghostLetterContent('Sói').ok,false);
 assert.equal(ghostLetterContent('👍').ok,false);
});
test('#34 reveals a response only to the requested player and once',()=>{
 const request={ownerId:'alice',targetId:'bob',matchId,status:'pending'};
 assert.equal(ghostLetterResponse({request,loginId:'bob',matchId,letter:'S'}).ok,true);
 assert.equal(ghostLetterResponse({request,loginId:'mallory',matchId,letter:'S'}).ok,false);
 assert.equal(ghostLetterResponse({request:{...request,status:'responded'},loginId:'bob',matchId,letter:'S'}).ok,false);
});
