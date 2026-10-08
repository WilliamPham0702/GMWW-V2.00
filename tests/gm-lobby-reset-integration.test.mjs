import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('src/index.js','utf8');
const start=src.indexOf('async function gmLobbyResetAll(env,request){');
const end=src.indexOf('async function gmRoomsPurge(',start);
assert.ok(start>=0&&end>start,'Global lobby reset handler exists');

function harness({failCode=null}={}){
  const calls=[],members={ABCDEF:[{loginId:'alpha'},{loginId:'beta'}],GHJKLM:[]};
  let generation=0;
  const memberStore=()=>({fetch:async(input,options={})=>{
    const url=String(input),path=new URL(url).pathname;
    if(path==='/directory/rooms/list'){
      assert.match(url,/includeEnded=1&includeDisabled=1/);
      return Response.json({rooms:[{code:'ABCDEF',enabled:true},{code:'GHJKLM',enabled:false,phase:'ended'}]});
    }
    if(path==='/global-settings/lobby-reset'){
      generation++;
      calls.push(['epoch',generation]);
      return Response.json({ok:true,generation});
    }
    if(path==='/global-settings/gm-presence'){
      calls.push(['gm-presence']);
      return Response.json({ok:true});
    }
    throw new Error('Unexpected member-store call: '+url);
  }});
  const gmRoomReset=async(_env,code,request)=>{
    assert.equal((await request.json()).forceEnd,true);
    calls.push(['reset',code]);
    if(code===failCode)return Response.json({ok:false},{status:500});
    return Response.json({ok:true,removedPlayers:members[code]||[]});
  };
  const gmRoomEnabled=async(_env,code,request)=>{
    assert.equal((await request.json()).enabled,false);
    calls.push(['off',code]);
    return Response.json({ok:true,enabled:false});
  };
  const fn=vm.runInNewContext(src.slice(start,end)+'; gmLobbyResetAll',{
    memberStore,gmRoomReset,gmRoomEnabled,
    normalizeRoomCode:s=>String(s||'').trim().toUpperCase(),
    isValidRoomCode:s=>/^[A-HJ-NP-Z2-9]{6}$/.test(s),
    j:(body,status=200)=>Response.json(body,{status}),Response,Request,Date,JSON,Number,String,Array
  });
  return{calls,run:()=>fn({},new Request('https://gmww.test/api/gm/lobby/reset',{method:'POST'})),getGeneration:()=>generation};
}

test('Lobby reset returns every participant, resets open/disabled rooms and turns all rooms OFF',async()=>{
  const h=harness(),res=await h.run(),json=await res.json();
  assert.equal(res.status,200);
  assert.equal(json.ok,true);
  assert.equal(json.roomsReset,2);
  assert.equal(json.devicesReturned,2);
  assert.equal(json.generation,1);
  assert.deepEqual(h.calls,[['reset','ABCDEF'],['off','ABCDEF'],['reset','GHJKLM'],['off','GHJKLM'],['epoch',1],['gm-presence']]);
});
test('Partial lobby reset fails closed and does not announce a completed global reset',async()=>{
  const h=harness({failCode:'GHJKLM'}),res=await h.run(),json=await res.json();
  assert.equal(res.status,502);
  assert.equal(json.error,'LOBBY_RESET_PARTIAL');
  assert.equal(h.getGeneration(),0);
  assert.equal(h.calls.some(c=>c[0]==='epoch'),false);
});
