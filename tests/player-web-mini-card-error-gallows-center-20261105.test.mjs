import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

test('Lá bài mini luôn có mặt lưng đã duyệt, không hiện ảnh vỡ (?)',()=>{
 assert.doesNotThrow(()=>new vm.Script(gmwwMembersLiveScript));
 assert.match(gmwwMembersLiveScript,/data-mini="role"[^>]{0,40}><img alt="" src="\/card-backs\/role-card-back-v1\.png"/);
 assert.match(gmwwMembersLiveScript,/data-mini="artifact"[^>]{0,40}><img alt="" src="\/card-backs\/artifact-card-back-v1\.png"/);
 assert.match(gmwwMembersLiveScript,/addEventListener\('error',\(\)=>\{if\(back&&img\.getAttribute\('src'\)!==back\)img\.src=back\}\)/);
});

test('Lỗi hành động hiển thị tiếng Việt, không lộ mã DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN',()=>{
 const src=playerWebSource('35-online-chat');
 assert.match(src,/catch\(e\)\{toast\(gmwwOnlineActionErrorText\(e\)\)\}/);
 assert.doesNotMatch(src,/toast\('Hành động chưa được chấp nhận: '\+String\(e\.message/);
 const fn=src.match(/function gmwwOnlineActionErrorText\(e\)\{[\s\S]*?\n\}\n/)[0];
 const f=new Function(fn+';return gmwwOnlineActionErrorText;')();
 assert.equal(f(new Error('DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN')),'Bạn đã dùng hành động này hoặc chưa đến lượt của bạn.');
 assert.doesNotMatch(f(new Error('SOME_UNKNOWN_CODE')),/SOME_UNKNOWN_CODE/);
});

test('Nút MỞ ĐỀ CỬ căn giữa chữ, icon không đẩy lệch',()=>{
 const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
 assert.match(css,/#battleGallowsPanel \[data-gallows-command="open"\]\{[^}]*justify-content:center/);
 assert.match(css,/\[data-gallows-command="open"\]::before\{[^}]*position:absolute/);
 assert.doesNotMatch(css,/\[data-gallows-command="open"\]::before\{[^}]*margin-right/);
});
