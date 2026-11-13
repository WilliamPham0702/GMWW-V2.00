import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GM_SOURCE_DIR,GM_GROUPS,PLAYER_WEB_SOURCE_DIR,PLAYER_WEB_GROUPS,groupFiles,groupBuffer,assertNoStrayGroups,readSourceAtLegacyPath,gmSource} from '../.github/scripts/source-groups.mjs';

for(const [label,dir,groups] of [['GM Server',GM_SOURCE_DIR,GM_GROUPS],['Player Web',PLAYER_WEB_SOURCE_DIR,PLAYER_WEB_GROUPS]]){
  test(label+': every source file belongs to a declared group and has an ordering prefix',()=>{
    assert.doesNotThrow(()=>assertNoStrayGroups(dir,groups));
    for(const group of groups){
      const files=groupFiles(dir,group);
      assert.deepEqual(files,[...files].sort(),group+' must assemble in file-name order');
      for(const file of files)assert.match(file,/\/[0-9]{2}-[a-z0-9-]+\.part$/,file);
      assert.deepEqual(fs.readdirSync(dir+'/'+group).filter(name=>!name.endsWith('.part')),[],group+' only holds .part files');
    }
  });
}

test('GM Server groups rebuild the packaged app byte for byte',()=>{
  const assembled=Buffer.concat(GM_GROUPS.map(group=>groupBuffer(GM_SOURCE_DIR,group)));
  assert.ok(assembled.equals(fs.readFileSync('server-game/current/app.js')));
});

test('legacy single-file paths resolve to the matching group',()=>{
  assert.equal(readSourceAtLegacyPath('server-game/src/45-online-chat.part'),gmSource('45-online-chat'));
  assert.equal(readSourceAtLegacyPath('package.json'),fs.readFileSync('package.json','utf8'));
});
