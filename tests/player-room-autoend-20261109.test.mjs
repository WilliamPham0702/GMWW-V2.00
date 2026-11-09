import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLoginId} from '../src/gmww-player-identity-rules.js';

const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const j=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const nw=s=>{const n=String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase();return n.includes('phe dan')?'Phe Dân':n.includes('phe soi')?'Phe Sói':n.includes('phe ba')?'Phe Ba':String(s||'')};
const from=source.indexOf('  computeWinProposal(meta,assignments,interactions){'),to=source.indexOf('  // Immutable, unbounded action history',from);
const a=source.indexOf('  // Player rooms end by themselves'),b=source.indexOf('  // Seats must be locked; deals the template');
assert.ok(from>0&&to>from&&a>0&&b>a);
const Cls=new Function('GM_SYNC_TOKEN','j','normalizeLoginId','normalizeWinnerFaction','return class R {\n'+source.slice(from,to)+'\n'+source.slice(a,b)+'\n}')('GM',j,normalizeLoginId,nw);

function room(meta,assignments,interactions=[]){
  const o=new Cls(),data=new Map([['assignments',assignments],['interactions',interactions]]);o.ended=[];
  o.ctx={storage:{get:async k=>data.get(k)}};
  o.gmEnd=async(req,body)=>{o.ended.push({auth:req.headers.get('authorization'),body});return j({ok:true})};
  return o;
}
const A=(loginId,faction)=>({loginId,faction});
const base={playerRoom:true,phase:'running',matchId:'m1'};

test('wolves all dead ends the match for the village',async()=>{
  const o=room(base,[A('a','Phe Sói'),A('b','Phe Dân'),A('c','Phe Dân')],[{type:'dead',loginId:'a',matchId:'m1'}]);
  assert.equal(await o.playerRoomAutoEnd(base),true);
  assert.equal(o.ended[0].body.winnerFaction,'Phe Dân');assert.equal(o.ended[0].body.matchId,'m1');assert.equal(o.ended[0].auth,'Bearer GM');
});
test('wolves equal to the rest end the match for the wolves',async()=>{
  const o=room(base,[A('a','Phe Sói'),A('b','Phe Dân'),A('c','Phe Dân')],[{type:'dead',loginId:'c',matchId:'m1'}]);
  assert.equal(await o.playerRoomAutoEnd(base),true);assert.equal(o.ended[0].body.winnerFaction,'Phe Sói');
});
test('no winner yet keeps the match running',async()=>{
  const o=room(base,[A('a','Phe Sói'),A('b','Phe Dân'),A('c','Phe Dân'),A('d','Phe Dân')]);
  assert.equal(await o.playerRoomAutoEnd(base),false);assert.equal(o.ended.length,0);
});
test('only player rooms in running phase auto-end',async()=>{
  const rows=[A('a','Phe Sói'),A('b','Phe Dân')],dead=[{type:'dead',loginId:'b',matchId:'m1'}];
  for(const m of [{...base,playerRoom:false},{...base,phase:'lobby'}]){const o=room(m,rows,dead);assert.equal(await o.playerRoomAutoEnd(m),false);assert.equal(o.ended.length,0)}
});
test('a failed end is reported as not ended',async()=>{
  const o=room(base,[A('a','Phe Sói'),A('b','Phe Dân')],[{type:'dead',loginId:'b',matchId:'m1'}]);
  o.gmEnd=async()=>j({ok:false},409);assert.equal(await o.playerRoomAutoEnd(base),false);
});
test('source wiring: auto-advance checks the win for player rooms, owner end is whitelisted',()=>{
  assert.match(source,/if\(meta\.playerRoom===true&&await this\.playerRoomAutoEnd\(meta\)\)return true;/);
  assert.match(source,/apply-template\|start\|end\)\$/);
  assert.match(source,/"template","start","end"\]\.includes\(action\)/);
  assert.match(source,/if\(action==="end"\)return this\.ownerEnd\(gm,meta\);/);
});
