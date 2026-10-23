import test from 'node:test';
import assert from 'node:assert/strict';
import {appendDemoHistory,demoHistoryForCycle,DEMO_HISTORY_LIMIT} from '../src/gmww-demo-history.js';

test('DEMO history is server-confirmed, append-only by event ID, newest last',()=>{
  const first={id:'r1',matchId:'M',cycleKey:'night-1',status:'accepted'};
  const second={id:'r2',matchId:'M',cycleKey:'night-1',status:'skipped'};
  const rows=appendDemoHistory(appendDemoHistory([],first),second);
  assert.deepEqual(rows,[first,second]);
  assert.deepEqual(appendDemoHistory(rows,second),rows);
});

test('DEMO history for current night excludes other matches and cycles, without truncating',()=>{
  const history=Array.from({length:120},(_,i)=>({id:'id-'+i,matchId:'A',cycleKey:'night-1',status:'accepted'}));
  history.push({id:'other-night',matchId:'A',cycleKey:'night-2'});
  history.push({id:'other-match',matchId:'B',cycleKey:'night-1'});
  assert.equal(demoHistoryForCycle(history,'A','night-1').length,120);
  assert.equal(demoHistoryForCycle(history,'A','night-2').length,1);
  assert.equal(demoHistoryForCycle(history,'B','night-1').length,1);
});

test('bounded Server DEMO history preserves recent events and ignores malformed entries',()=>{
  let rows=[];
  for(let i=0;i<DEMO_HISTORY_LIMIT+4;i++)rows=appendDemoHistory(rows,{id:String(i),matchId:'M',cycleKey:'night-1'});
  assert.equal(rows.length,DEMO_HISTORY_LIMIT);
  assert.equal(rows[0].id,'4');
  assert.equal(rows.at(-1).id,String(DEMO_HISTORY_LIMIT+3));
  assert.deepEqual(appendDemoHistory(rows,null),rows);
});
