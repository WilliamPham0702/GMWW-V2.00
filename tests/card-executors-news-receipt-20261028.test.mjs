import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Snapshot of Người Loan Tin uses durable interaction receipt ID',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.match(s,/clientEventId===token\+":"\+id/);
 assert.doesNotMatch(s,/x\.actionNonce===token/);
});
