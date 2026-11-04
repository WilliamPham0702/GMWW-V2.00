import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Scope: UI-only divider for the Player Web Online chat composer.
const source=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const bundle=readFileSync('src/gmww-members-live.js','utf8');
const rule='#gmwwChatPanel.open #gmwwChatForm{border-top:1px solid rgba(255,255,255,.48)}';

test('expanded Online chat has a subtle 1px divider above the message composer',()=>{
  assert.equal(source.split(rule).length-1,1,'One scoped divider rule');
  assert.ok(source.indexOf(rule)>source.indexOf('#gmwwChatPanel.open #gmwwChatLines'),'Divider belongs to expanded message list/composer styles');
  assert.match(source,/#gmwwChatPanel form\{display:flex;gap:4px;padding:3px\}/,'Composer layout unchanged');
  assert.match(source,/<div id="gmwwChatLines" role="log"><\/div><div id="gmwwChatHelp"><\/div><form id="gmwwChatForm">/,'Message list is above the composer');
});

test('shipped Player Web bundle includes the composer divider',()=>{
  assert.ok(bundle.includes(rule),'Bundle must contain the new divider style');
});
