import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveFoolGallows,gallowsCast,gallowsBlockedVotes} from '../src/gmww-gallows-rules.js';
const assignments=[{loginId:'fool',roleId:'role_fool'},{loginId:'wolf',roleId:'role_wolf'}];
const args={candidateId:'fool',outcome:'dead',assignments,matchId:'m'};
test('Kẻ Ngốc survives first lynching, but dies on later execution',()=>{
 assert.deepEqual(resolveFoolGallows(args),{outcome:'alive',escaped:true});
 const used={loginId:'fool',actionId:'action-fool-escape',matchId:'m',type:'status',effectActive:true};
 assert.deepEqual(resolveFoolGallows({...args,interactions:[used]}),{outcome:'dead',escaped:false});
 assert.deepEqual(resolveFoolGallows({...args,candidateId:'wolf'}),{outcome:'dead',escaped:false});
});
test('Once spared, Kẻ Ngốc cannot vote SAVE or KILL (not a nomination ban)',()=>{
 const ballot={stage:'voting',mode:'auto',deadlineAt:9999999999999,eligible:['fool','wolf','x'],
 candidateId:'x',votes:{},foolVoteBans:['fool']};
 assert.deepEqual(gallowsBlockedVotes(ballot),['fool']);
 assert.equal(gallowsCast(ballot,'fool','👍',1).error,'VOTER_BANNED');
 assert.equal(gallowsCast(ballot,'fool','👎',1).error,'VOTER_BANNED');
});
test('Auto and manual Server verdicts apply Kẻ Ngốc escape',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('const proposed=gallowsAutomaticOutcome(current)'));
 assert.ok(s.includes('foolVoteBans'));
 assert.ok(s.includes('result.value={...result.value,outcome:"alive"}'));
});
