// Mã nguồn GM Server (server-game/src) và Player Web (src/player-web-src) được chia thành
// nhóm chức năng; mỗi nhóm là một thư mục chứa các file .part ghép theo thứ tự tên file.
// Bản đóng gói (server-game/current/app.js, src/gmww-members-live.js) = nối mọi nhóm theo thứ tự dưới đây.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {workerSource} from './worker-source.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

export const GM_SOURCE_DIR='server-game/src';
export const GM_GROUPS=[
  '00-core-and-library',
  '10-library-and-settings',
  '20-members-and-roster',
  '30-village-and-setup',
  '40-battle-and-timeline',
  '45-online-chat',
  '50-roles-and-artifacts'
];
export const PLAYER_WEB_SOURCE_DIR='src/player-web-src';
export const PLAYER_WEB_GROUPS=[
  '00-bootstrap-and-session',
  '10-role-card-artwork',
  '20-village-and-profile',
  '30-rooms-and-realtime',
  '35-online-chat',
  '36-gm-observer',
  '37-player-rooms',
  '40-cards-and-game',
  '50-privacy-and-runtime'
];

// Đường dẫn (tính từ gốc repo) của các file trong một nhóm, theo thứ tự ghép.
export function groupFiles(baseDir,group){
  const dir=path.join(root,baseDir,group);
  const names=fs.readdirSync(dir).filter(name=>name.endsWith('.part')).sort();
  if(!names.length)throw new Error('Nhóm nguồn rỗng: '+baseDir+'/'+group);
  return names.map(name=>baseDir+'/'+group+'/'+name);
}
export function groupBuffer(baseDir,group){
  return Buffer.concat(groupFiles(baseDir,group).map(file=>fs.readFileSync(path.join(root,file))));
}
// Mọi thư mục con phải được khai báo trong danh sách nhóm, để không có file nào bị bỏ sót khi ghép.
export function assertNoStrayGroups(baseDir,groups){
  const stray=fs.readdirSync(path.join(root,baseDir),{withFileTypes:true})
    .filter(entry=>entry.isDirectory()?!groups.includes(entry.name):entry.name.endsWith('.part')).map(entry=>entry.name);
  if(stray.length)throw new Error('Nguồn chưa khai báo trong '+baseDir+': '+stray.join(', '));
}
// Toàn bộ mã của một nhóm, ví dụ gmSource('40-battle-and-timeline').
export const gmSource=group=>groupBuffer(GM_SOURCE_DIR,group).toString('utf8');
export const playerWebSource=group=>groupBuffer(PLAYER_WEB_SOURCE_DIR,group).toString('utf8');

// Trước khi tách, mỗi nhóm là một file "<nhóm>.part" và toàn bộ Worker nằm trong src/index.js.
// Các phạm vi CI đã duyệt cho PR cũ vẫn gọi theo đường dẫn đó: hàm này trả về nội dung tương ứng hiện nay.
export function readSourceAtLegacyPath(file){
  const legacy=String(file).match(/^(server-game\/src|src\/player-web-src)\/([0-9]{2}-[a-z-]+)\.part$/);
  if(legacy)return groupBuffer(legacy[1],legacy[2]).toString('utf8');
  if(file==='src/index.js')return workerSource();
  return fs.readFileSync(path.resolve(root,file),'utf8');
}
