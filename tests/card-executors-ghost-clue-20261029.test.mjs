import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGhostClue,ghostClueAllowed,moderateGhostClue} from '../src/gmww-ghost-clue.js';
test('one Vietnamese Unicode clue word is valid, multiple words and player names are not',()=>{
 assert.equal(validateGhostClue({text:'Sói'}).ok,true);
 assert.equal(validateGhostClue({text:'Phe Sói'}).error,'GHOST_ONE_WORD_ONLY');
 assert.equal(validateGhostClue({text:'Lan',playerNames:['Lân','Bình']}).ban,true);
 assert.equal(validateGhostClue({text:'🐺'}).ok,false);
 assert.equal(validateGhostClue({text:' '}).ok,false);
});
test('only dead Ghost in morning, once per day, not expelled/banned',()=>{
 const valid={phase:'running',cyclePhase:'morning',roleId:'role_ghost',dead:true};
 assert.equal(ghostClueAllowed(valid).ok,true);
 for(const x of [{dead:false},{roleId:'role_seer'},{previous:{id:'a'}},
   {ban:true},{expelled:true},{cyclePhase:'night'}])
  assert.equal(ghostClueAllowed({...valid,...x}).ok,false);
});
test('GM decision is explicit; no public message without approval',()=>{
 const pending={id:'c',text:'Sói',status:'pending'};
 assert.equal(moderateGhostClue({clue:pending,decision:'approve'}).clue.status,'approved');
 assert.equal(moderateGhostClue({clue:pending,decision:'reject',violation:true}).ban,true);
 assert.equal(moderateGhostClue({clue:{...pending,status:'approved'},decision:'approve'}).ok,false);
});
