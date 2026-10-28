import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveStrongmanWolfBite} from '../src/gmww-wolf-night-resolution.js';
const assignments=[{loginId:'a',roleId:'role_strongman'},{loginId:'b',roleId:'role_wolf'}];
const raw={ok:true,victims:['a','b'],blocked:[]};
test('Lực Sỹ absorbs first lethal bite but not others, once per match',()=>{
 const first=resolveStrongmanWolfBite({wolfResolution:raw,assignments,matchId:'m',night:1});
 assert.deepEqual(first,{victims:['b'],absorbed:['a']});
 const already=[{loginId:'a',matchId:'m',actionId:'action_strongman_bite',effectActive:true}];
 const second=resolveStrongmanWolfBite({wolfResolution:raw,assignments,interactions:already,matchId:'m',night:2});
 assert.deepEqual(second,{victims:['a','b'],absorbed:[]});
 assert.deepEqual(resolveStrongmanWolfBite({wolfResolution:raw,assignments,interactions:already,matchId:'other',night:2}),first);
});
test('A protected bite never spends Lực Sỹ special life',()=>{
 assert.deepEqual(resolveStrongmanWolfBite({wolfResolution:{ok:true,victims:[],blocked:['a']},
   assignments,matchId:'m',night:1}),{victims:[],absorbed:[]});
});
test('Dawn Server persists idempotent Lực Sỹ protection and announces the public role',()=>{
 const server=fs.readFileSync('src/index.js','utf8');
 for(const fragment of ['resolveStrongmanWolfBite','strongman-bite:','action_strongman_bite','type:"role_revealed"'])assert.ok(server.includes(fragment));
});
