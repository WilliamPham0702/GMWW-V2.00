import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {wolfPackMembers,shouldWakeWolfPack,privateWolfRecognition} from '../src/gmww-wolf-recognition.js';

const wolves=[
 {loginId:'alice',roleId:'role_wolf',roleName:'Sói Thường',faction:'Phe Sói'},
 {loginId:'bob',roleId:'role_alpha_wolf',roleName:'Sói Trùm',faction:'Phe Sói'},
 {loginId:'carl',roleId:'role_cursed',roleName:'Kẻ Bị Nguyền',faction:'Phe Dân'}
];
const roleTurn={kind:'wolf-introduction',id:'wolf-introduction',recognitionIds:['alice','bob']};
const makeRuntime=(step=roleTurn)=>({night:1,queue:[step],cursor:0,completed:false,deadlineAt:new Date(Date.now()+30000).toISOString()});
const meta={phase:'running',cyclePhase:'night',cycleNight:1,matchId:'m1'};

test('WOLF-01 two different players (even same role) required; dead/expelled players excluded',()=>{
 assert.equal(shouldWakeWolfPack(1,wolfPackMembers(wolves.slice(0,1),[],'m1')),false);
 const repeated=[wolves[0],{...wolves[0],loginId:'bob'}];
 assert.equal(shouldWakeWolfPack(1,wolfPackMembers(repeated,[],'m1')),true);
 const dead=[{loginId:'bob',matchId:'m1',type:'dead',effectActive:true}];
 assert.equal(shouldWakeWolfPack(1,wolfPackMembers(wolves,dead,'m1')),false);
 assert.equal(wolfPackMembers(wolves,[{loginId:'bob',matchId:'other',type:'dead',effectActive:true}],'m1').length,2);
});
test('WOLF-01 night 2+ wakes again only after a newly recognized wolf',()=>{
 const one=wolfPackMembers(wolves,[],'m1');
 assert.equal(shouldWakeWolfPack(1,one),true);
 assert.equal(shouldWakeWolfPack(2,one,['alice','bob']),false);
 const converted=wolfPackMembers([...wolves.slice(0,2),{...wolves[2],faction:'Phe Sói'}],[],'m1');
 assert.equal(converted.length,3);
 assert.deepEqual(converted.find(x=>x.loginId==='carl'),{loginId:'carl',roleName:'Kẻ Bị Nguyền',converted:true});
 assert.equal(shouldWakeWolfPack(2,converted,['alice','bob']),true);
 assert.equal(shouldWakeWolfPack(3,converted,['alice','bob','carl']),false);
});
test('WOLF-01 only active wolves receive private role labels; other phases, expiration and failed ownership return null',()=>{
 const roster=wolfPackMembers(wolves,[],'m1');
 assert.equal(privateWolfRecognition(meta,makeRuntime(),'carl',roster),null);
 assert.equal(privateWolfRecognition(meta,makeRuntime(),'alice',roster)?.labels.length,2);
 assert.equal(privateWolfRecognition({...meta,cyclePhase:'morning'},makeRuntime(),'alice',roster),null);
 assert.equal(privateWolfRecognition(meta,{...makeRuntime(),completed:true},'alice',roster),null);
 assert.equal(privateWolfRecognition(meta,makeRuntime({...roleTurn,kind:'role'}),'alice',roster),null);
 assert.equal(privateWolfRecognition(meta,{...makeRuntime(),deadlineAt:new Date(Date.now()-500).toISOString()},'alice',roster),null);
 const converted=wolfPackMembers([...wolves.slice(0,2),{...wolves[2],faction:'Phe Sói'}],[],'m1');
 const trio={...roleTurn,recognitionIds:['alice','bob','carl']};
 assert.equal(privateWolfRecognition(meta,makeRuntime(trio),'carl',converted)?.labels.find(x=>x.loginId==='carl')?.converted,true);
});
test('WOLF-01 rejects leaking a public runtime queue over WebSocket and renders only authenticated labels',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 const player=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
 const ws=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 assert.match(worker,/Object\.entries\(payload\)\.filter\(\(\[key\]\)=>key!=='runtime'&&key!=='nightRuntime'/);
 assert.match(worker,/const wolfRecognition=privateWolfRecognition\(/);
 assert.match(player,/wolfLabel=wolfView\?/);
 assert.match(player,/roleName=wolfLabel\?/);
 assert.match(ws,/setPrivateWolfRecognition\(null\)/);
 assert.match(ws,/void refreshPrivateRole\(true\)/);
});
