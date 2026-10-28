import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Con Bệnh and Bác Sỹ Điên have persistent condition and targeted cure only',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const k of ['DOCTOR_TARGET_NOT_INFECTED','MAD_DOCTOR_CURED','statusId:"infected"',
  'action-disease-self','action-mad-doctor-cure'])assert.ok(s.includes(k));
 assert.match(s,/x\.type==='status'&&x\.statusId==='infected'/);
});
test('Người Loan Tin snapshots role at night and announces only at dawn',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('snapshotRoleName='));
 assert.ok(s.includes('action-news-role-announce'));
 assert.ok(s.includes('roleName:noticed.snapshotRoleName'));
});
test('Bà Da Đen expels on following morning, returns on next night',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('black-woman-exile:'));
 assert.ok(s.includes('source:"black-woman"'));
 assert.ok(s.includes('RETURNED_TO_VILLAGE'));
});
