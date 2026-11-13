import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=workerSource();
const block=src.slice(src.indexOf('WOLF-02:'),src.indexOf('WOLF-02:')+1400);

test('WOLF-02 pack label follows the wolf count dealt at match start, not living wolves',()=>{
  assert.match(block,/initialWolfCount:/,'initial wolf count is persisted per match');
  assert.match(block,/if\(n===1\)await this\.ctx\.storage\.put\(initialWolfKey/,'count is frozen on night 1');
  assert.match(block,/soloWolf=initialWolfCount<2/,'only one dealt wolf means no pack turn');
  assert.match(block,/label:soloWolf\?soloLabel:"Bầy Sói Cắn"/,'two or more dealt wolves keep the pack label');
  assert.doesNotMatch(block,/eligiblePack\.length\s*[<>=]/,'living wolf count must never pick the label');
});

test('WOLF-02 plain Sói Thường never gets a second wake from extra card functions',()=>{
  assert.match(src,/row\.roleId!=="role_wolf"&&privateAssignments\.filter\(/);
});
