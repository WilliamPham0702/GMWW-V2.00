import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync('src/index.js','utf8'),fragment=source.slice(source.indexOf('  async gmEnd(request,body){'),source.indexOf('  async alarm(){'));
test('Server completion receipt is idempotent and cannot rewrite a confirmed winner',async()=>{
 const meta={matchId:'m1',phase:'running'},data=new Map([['meta',meta],['players',{'member:alice':{loginId:'alice',kind:'member'}}],['roles:alice',[{roleName:'Dân',faction:'Phe Dân'}]],['interactions',[]]]),events=[];
 const Room=vm.runInNewContext('(class {'+fragment+'})',{j:(x,status=200)=>Response.json(x,{status}),normalizeWinnerFaction:x=>String(x),publicRoom:x=>({...x}),publicPlayer:x=>x,playerSetupComplete:()=>true,normalizeLoginId:x=>x,pruneInteractions:x=>x,ROOM_IDLE_TTL:10000});
 const room=new Room();room.ctx={storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),setAlarm:async()=>{}}};room.gmAuthorized=async()=>({ok:true,meta:data.get('meta')});room.broadcast=x=>events.push(x);
 const finish=async winner=>{const r=await room.gmEnd({}, {matchId:'m1',winnerFaction:winner});return{status:r.status,...await r.json()}};
 const one=await finish('Phe Dân');assert.equal(one.memberResults[0].result,'win');assert.equal((await finish('Phe Dân')).idempotent,true);assert.equal(data.get('meta').resultVersion,1);assert.equal(events.filter(x=>x.type==='game_result').length,1);assert.equal((await finish('Phe Sói')).error,'WINNER_ALREADY_CONFIRMED');
});
test('Player reconnect/poll recognizes completed results while retained room is already in lobby',()=>{
 const script=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8'),fn=vm.runInNewContext('('+script.slice(0,script.indexOf('\n'))+')');assert.equal(fn({phase:'lobby',endedAt:'now',winnerFaction:'Phe Sói',lastEndedMatchId:'m1'}),true);assert.equal(fn({phase:'lobby',endedAt:null,winnerFaction:null}),false);
});
