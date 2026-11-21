import test from 'node:test';
import assert from 'node:assert/strict';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
const web=playerWebSource('37-player-rooms');
test('Menu trên Chơi nhanh: gọn như menu dưới (62px, tối đa 520px), không nền',()=>{
  assert.match(web,/#quickSetupStrip\{[^}]*max-width:520px;height:62px;margin:0 auto/);
  assert.match(web,/:host\{display:block;box-sizing:border-box;background:transparent/);
  assert.doesNotMatch(web,/:host\{display:block;box-sizing:border-box;background:linear-gradient/);
});
test('Chỉ chủ phòng thấy Ván Mẫu / Bắt Đầu; người vào phòng khác chỉ có Sảnh Chờ · Tạo Phòng',()=>{
  assert.match(web,/const quickSteps=\(\)=>pr\.own&&inOwnRoom\(\)\?QUICK_ORDER:QUICK_ORDER\.slice\(0,2\)/);
  assert.match(web,/b\.hidden=!qsteps\.some\(s=>s\[0\]===b\.dataset\.quickStep\)/);
  assert.match(web,/pr\.view=quickSteps\(\)\.some\(s=>s\[0\]===k\)\?k:'room'/);
  assert.match(web,/if\(!quickSteps\(\)\.some\(x=>x\[0\]===pr\.view\)\)/);
  assert.doesNotMatch(web,/Chủ phòng quản lý thành viên và khóa\/mở phòng/);
});
import {workerSource} from '../.github/scripts/worker-source.mjs';
const worker=workerSource();
test('Tên phòng mặc định "Làng của <người tạo>", nút Sao chép',()=>{
  assert.match(worker,/body\.roomName=normalizeRoomName\("Làng của "\+String\(own\?\.member\?\.displayName\|\|ownerLoginId\)\)/);
  assert.match(web,/btn\('Sao chép',/);assert.doesNotMatch(web,/btn\('Sao chép mã'/);
});
test('Vòng ghế Chơi nhanh lấy đống lửa làm tâm ngay từ sảnh',()=>{
  assert.match(worker,/if\(meta\.quickPlay===true\)\{meta\.seatLayout="circle";meta\.seatSpacing=100;meta\.seatOffset=await this\.quickPlayFireOffset\("day"\)\}/);
  assert.match(worker,/seatOffset:await this\.quickPlayFireOffset\("night"\)/);
});
test('Vào trận: đóng trang thiết lập, chủ phòng chỉ thêm nút Kết thúc ván',()=>{
  assert.match(web,/for\(const key of \['clock','chat','tray','action','restore','end'\]\)/);
  assert.match(web,/end\.hidden=!isOwner/);
  assert.doesNotMatch(web,/btn\(room\.autoGM\?'Tạm dừng':'Tiếp tục'/);
  assert.match(web,/toLowerCase\(\)==='running'\)pr\.open=false;/);
});
test('MOVE_NOT_ACTIVE không hiện mã lỗi thô',()=>{
  const v=playerWebSource('20-village-and-profile');
  assert.match(v,/if\(String\(e\?\.data\?\.error\|\|''\)==='MOVE_NOT_ACTIVE'\)\{try\{await pollRoomState\(\)\}catch\(_\)\{\}syncVillageFrame\(\);return\}/);
});
test('Chơi nhanh: trang không có dòng tiêu đề + nút ×',()=>{
  assert.match(web,/panel\.append\(el\('i','gmww-pr-grip'\)\);void head;/);
});
test('Danh mục audio chung: không chia sẻ promise đang tải giữa các request (tránh treo DO → không nhận vai)',async()=>{
  const fs=await import('node:fs');const src=fs.readFileSync(new URL('../src/worker/support/shared-audio-release.js',import.meta.url),'utf8');
  assert.doesNotMatch(src,/if\(loading\)return loading/);
  assert.doesNotMatch(src,/let cached=null,cachedUntil=0,loading=null/);
});
test('Audio Chơi nhanh: chấp nhận URL clip chung ?a=s<sha256>',()=>{
  const chat=playerWebSource('35-online-chat');
  assert.match(chat,/\/\^\(\?:\[a-f0-9\]\{32\}\|s\[a-f0-9\]\{64\}\)\$\/\.test\(u\.slice\(base\.length\)\)/);
});
test('Phòng người chơi: đủ điều kiện thắng thì báo alarm ngay',()=>{
  assert.match(worker,/winDue=meta\.playerRoom===true&&meta\.autoGM!==false&&String\(meta\.phase\|\|""\)\.toLowerCase\(\)==="running"&&this\.computeWinProposal\(/);
  assert.match(worker,/winDue\|\|Infinity\)/);
});
test('Chơi nhanh: máy chủ tự phát audio sáng / Lên Giàn / xác nhận; client phát trọn clip',()=>{
  assert.match(worker,/async quickPlayDayAudio\(meta,targets,tag\)/);
  assert.match(worker,/system:audio_system_morning_deaths_intro/);
  assert.match(worker,/system:audio_system_gallows_open_nomination/);
  assert.match(worker,/targets:\['system:audio_system_confirm'\]/);
  assert.match(worker,/await this\.quickPlayConfirmCue\(\)/);
  const chat=playerWebSource('35-online-chat');
  assert.match(chat,/function gmwwAnnouncementOffset\(cue\)\{return 0\}/);
});
test('Không tên trang / nút × trên Web và Server; thanh trận Web có hộp hành động + Khôi phục, đồng hồ không icon',async()=>{
  assert.match(web,/panel\.append\(el\('i','gmww-pr-grip'\)\);void head;/);
  assert.match(web,/chatPage\.append\(el\('i','gmww-pr-grip'\),el\('div','gmww-pr-chatbody'\)\)/);
  assert.match(web,/\['clock','chat','tray','action','restore','end'\]/);
  assert.match(web,/clock\.textContent=t/);
  const chat=playerWebSource('35-online-chat');
  assert.match(chat,/function gmwwPlayerRestoreClick\(\)/);
  assert.match(chat,/dock\.classList\.add\('in-tray'\)/);
  assert.match(chat,/className='gmww-act-name'/);
  const fs=await import('node:fs');const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
  assert.match(css,/\.sheet:not\(#playGameSheet\) \.sheet-card>\.sheet-head\{display:none!important\}/);
});
test('Chơi lại: Bắt Đầu tự replay ván đã kết thúc; thanh trận cố định, ban đêm chat là 💬',()=>{
  assert.match(web,/if\(\(pr\.state\?\.room\|\|room\)\.endedAt\)\{await callOwner\('replay','POST',\{\}\);await refresh\(\)\}/);
  assert.doesNotMatch(web,/if\(!pr\.own\|\|!inOwnRoom\(\)\|\|room\.endedAt\)return;/);
  assert.match(web,/chatLabel=night\?'💬':'Nhắn cho phòng…'/);
  assert.match(web,/const cols=night\?\['58px','52px','minmax\(0,1fr\)','66px'\]/);
});
test('Menu trên không viền trắng, nền menu mờ; tab cũ tự nhận bản Web mới (webBuild)',()=>{
  const v=playerWebSource('20-village-and-profile');
  assert.match(v,/#playBattleTop\{border:0!important;outline:0!important;box-shadow:none!important;background:rgba\(5,39,58,\.30\)!important/);
  assert.match(web,/gm-top-menu-v293>\*\{-webkit-backdrop-filter:blur\(12px\)/);
  assert.match(worker,/webBuild:webBuild\(\)/);
  assert.match(worker,/replaceAll\("__GMWW_WEB_BUILD__",webBuild\(\)\)/);
  const u=playerWebSource('50-privacy-and-runtime');
  assert.match(u,/buildChanged=!!build&&!GMWW_WEB_BUILD\.startsWith\('__'\)&&build!==GMWW_WEB_BUILD/);
});
test('Lượt đêm xong → 5 giây rồi qua lượt; Lên Giàn: đủ phiếu thì chốt sớm, Chơi nhanh giữ kết quả 8 giây; đồng hồ theo Lên Giàn; cảnh ngày/đêm theo phòng',async()=>{
  assert.match(worker,/async shortenNightTurnAfterAction\(\)/);
  assert.match(worker,/target=Date\.now\(\)\+5000/);
  assert.match(worker,/await this\.shortenNightTurnAfterAction\(\)/);
  assert.match(worker,/gallowsVerdictHoldMs\(meta\)/);
  assert.match(worker,/need\.every\(id=>Object\.prototype\.hasOwnProperty\.call\(b\.votes\|\|\{\},id\)\)/);
  const {gallowsVerdictHoldMs}=await import('../src/gmww-gallows-rules.js');
  assert.equal(gallowsVerdictHoldMs({quickPlay:true}),8000);assert.equal(gallowsVerdictHoldMs({}),30000);
  assert.match(web,/stage==='voting'\?Number\(g\.deadlineAt\)/);
  const v=playerWebSource('20-village-and-profile');
  assert.match(v,/cyclePhase=String\(room\.cyclePhase\|\|cycle\.phase\|\|''\)/);
});
