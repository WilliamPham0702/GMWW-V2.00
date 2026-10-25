import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const s=readFileSync('server-game/current/app.js','utf8');
const from=s.indexOf('function memberStats(m){');
const to=s.indexOf('function setMemberBusy(',from);
const home=s.slice(s.indexOf('function gmwwHomeTop3Ranked('),s.indexOf('function gmwwHomeRenderTop3('));
const full=s.slice(s.indexOf('function renderMemberRanking()'),s.indexOf('function memberHistoryRows(',s.indexOf('function renderMemberRanking()')));
const homeList=s.slice(s.indexOf('function gmwwHomeRenderMembers('),s.indexOf('async function gmwwHomeRefresh(',s.indexOf('function gmwwHomeRenderMembers(')));
const make=(name,wins,losses)=>({displayName:name,loginId:name,stats:{wins,losses}});
const {gmwwRankMembers,gmwwHomeTop3Ranked,memberStats}=vm.runInNewContext(s.slice(from,to)+home+'({gmwwRankMembers,gmwwHomeTop3Ranked,memberStats})',{});
const order=arr=>[...arr].sort(gmwwRankMembers).map(x=>x.displayName);
test('Ưu tiên nhiều ván trước, kể cả tỷ lệ thắng thấp',()=>{
 const rows=[make('10 ván 10%',1,9),make('2 ván 100%',2,0),make('20 ván 0%',0,20)];
 assert.deepEqual(order(rows),['20 ván 0%','10 ván 10%','2 ván 100%']);
 assert.deepEqual([...gmwwHomeTop3Ranked(rows)].map(x=>x.displayName),order(rows));
});
test('Bằng số ván: ưu tiên tỷ lệ thắng; nếu tỷ lệ bằng, ưu tiên tên',()=>{
 const rows=[make('C',3,7),make('A',7,3),make('B',7,3),make('D',1,9)];
 assert.deepEqual(order(rows),['A','B','C','D']);
});
test('Người chưa chơi ở cuối toàn bộ bảng và không có trong Top 3',()=>{
 const rows=[make('Chưa chơi',0,0),make('Có ván',0,2)];
 assert.deepEqual(order(rows),['Có ván','Chưa chơi']);
 assert.equal(gmwwHomeTop3Ranked(rows).length,1);
});
test('Trang Chủ, Top 3 và Xếp Hạng Thành Viên dùng chung quy tắc',()=>{
 assert.match(full,/const rows=\[\.\.\.memberAdminState\.members\]\.sort\(gmwwRankMembers\)/);
 assert.match(home,/\.sort\(gmwwRankMembers\)/);
 assert.match(homeList,/const ranking=\[\.\.\.rows\]\.sort\(gmwwRankMembers\)/);
 const html=readFileSync('server-game/current/GMWW.html','utf8');
 assert.match(html,/<h2>Top 3 Xếp Hạng<\/h2>/);
 assert.match(html,/Ưu tiên số ván đã chơi · Cùng số ván xét tỷ lệ thắng/);
});
