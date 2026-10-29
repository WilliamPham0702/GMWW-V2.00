import test from 'node:test';
import assert from 'node:assert/strict';
import {audit107,REQUIRED_CRITERIA} from '../.github/scripts/check-rule-acceptance-107.mjs';
const cards=()=>[
 ...Array.from({length:63},(_,i)=>({id:'role_'+i,kind:'role'})),
 ...Array.from({length:44},(_,i)=>({id:'artifact_'+i,kind:'artifact'}))
];
function fixtures(){
 const entries=cards().map(card=>({...card,status:'CERTIFIED',
   acceptance:Object.fromEntries(REQUIRED_CRITERIA.map(k=>[k,{status:'PASS',evidence:['tests/example.test.mjs']}]))}));
 return {matrix:{counts:{roles:63,artifacts:44,certified:107},cards:entries},
   catalog:{cards:cards()}};
}
test('107-card acceptance needs the exact 63+44 catalog with all 14 checks proven',()=>{
 const {matrix,catalog}=fixtures();
 assert.deepEqual(audit107(matrix,catalog).ok,true);
 assert.equal(REQUIRED_CRITERIA.length,14);
});
test('No release even when 106 cards pass and CI tests would otherwise be green',()=>{
 const {matrix,catalog}=fixtures();
 matrix.cards[0].status='NOT_CERTIFIED';
 matrix.cards[0].acceptance.audio={status:'NOT_VERIFIED',evidence:[]};
 matrix.counts.certified=106;
 const result=audit107(matrix,catalog);
 assert.equal(result.ok,false);
 assert.equal(result.certified,106);
 assert.equal(result.missing,1);
});
test('Cannot certify a card by setting status without actual UI, audio and cross-interaction proof',()=>{
 const {matrix,catalog}=fixtures();
 matrix.cards[0].acceptance.gmUi={status:'PARTIAL',evidence:[]};
 assert.equal(audit107(matrix,catalog).ok,false);
});
test('Reject duplicate IDs, catalog mismatches and non-existent evidence',()=>{
 const {matrix,catalog}=fixtures();
 matrix.cards[1].id=matrix.cards[0].id;
 assert.equal(audit107(matrix,catalog).ok,false);
 const good=fixtures();
 assert.equal(audit107(good.matrix,good.catalog,{evidenceExists:()=>false}).ok,false);
});
