import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dayClockRemainingMs,shiftDayClock} from '../src/gmww-day-clock.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const now=Date.parse('2026-10-21T00:00:00.000Z');
const config={timing:{villageDiscussionSec:300}};
test('day clock shifts one minute in either direction without editing saved template',()=>{
  const meta={autoGM:true,cycleStartedAt:new Date(now-120000).toISOString()};
  const plus=shiftDayClock(meta,config,1,now);
  assert.equal(plus.remainingMs,240000);
  assert.equal(Date.parse(plus.dayDeadlineAt),now+240000);
  const minus=shiftDayClock({...meta,dayDeadlineAt:plus.dayDeadlineAt},config,-1,now);
  assert.equal(minus.remainingMs,180000);
  assert.deepEqual(config,{timing:{villageDiscussionSec:300}});
  assert.equal(shiftDayClock(meta,config,2,now),null);
});
test('paused day stays frozen while adjusted and resumes from stored milliseconds',()=>{
  const meta={autoGM:false,autoPausedRemainingMs:23000,dayDeadlineAt:new Date(now-100000).toISOString()};
  assert.equal(dayClockRemainingMs(meta,config,now+20000),23000);
  const newDay=shiftDayClock(meta,config,1,now);
  assert.equal(newDay.remainingMs,83000);
  assert.equal(newDay.autoPausedRemainingMs,83000);
  const remaining=dayClockRemainingMs({...meta,...newDay},config,now+120000);
  assert.equal(remaining,83000);
});
test('clock clamps to zero and a maximum of 24 hours',()=>{
  const meta={autoGM:true,dayDeadlineAt:new Date(now+15000).toISOString()};
  assert.equal(shiftDayClock(meta,config,-1,now).remainingMs,0);
  const capped={autoGM:false,autoPausedRemainingMs:24*3600000};
  assert.equal(shiftDayClock(capped,config,1,now).remainingMs,24*3600000);
});
test('day dock has distinct icons, full action sheet, and synchronized API',()=>{
  const html=read('../server-game/current/GMWW.html');
  const app=read('../server-game/current/app.js');
  const worker=read('../src/index.js');
  const css=read('../server-game/current/day-menu.css');
  for(const id of ['battleDayNoticeToggle','battleDayGallowsToggle','battleDayActionMenu','battleDayActionList'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/📖/);assert.match(html,/🤯/);
  assert.match(app,/deltaMinutes,matchId:room\.matchId/);
  assert.match(app,/battleState\.dayActionsOpen/);
  assert.match(app,/battleState\.morningOpen/);
  assert.match(worker,/gmDayClock\(request,body\)/);
  assert.match(worker,/shiftDayClock\(meta,cfg,body\?\.deltaMinutes/);
  assert.match(css,/data-battle-phase="day"/);
});
