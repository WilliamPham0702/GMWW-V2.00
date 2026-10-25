import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../server-game/current/action-icon-library.js',import.meta.url),'utf8');
const start=source.indexOf("box.innerHTML=rows.map(x=>");
const stop=source.indexOf("box.querySelectorAll('[data-icon-edit]')",start);
const card=start>=0&&stop>start?source.slice(start,stop):'';
test('GM Icon card displays only artwork, name and edit/delete controls',()=>{
 assert.ok(card.includes('<img src='));
 assert.ok(card.includes('<b>'));
 assert.ok(card.includes('data-icon-edit'));
 assert.ok(card.includes('data-icon-delete'));
 assert.ok(!card.includes('gmww-icon-actions'));
 assert.ok(!card.includes('x.actions.join'));
 assert.ok(!card.includes('Kéo vào người chơi'));
 assert.ok(!card.includes('Chọn đủ mục tiêu'));
 assert.ok(!card.includes('Chọn hướng'));
 assert.ok(!card.includes('Chọn lá bài'));
});
test('Icon remains searchable by hidden action ID, editable and auditable',()=>{
 assert.ok(source.includes("x.actions.join(' ')"));
 assert.ok(source.includes("document.getElementById('gmwwIconActions').value=row.actions.join(', ')"));
 assert.ok(source.includes('function auditCatalog()'));
 assert.ok(source.includes('function save()'));
});
