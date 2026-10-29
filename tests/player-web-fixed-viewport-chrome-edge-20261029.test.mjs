import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

const boot=readFileSync('src/player-web-src/00-bootstrap-and-session.part','utf8');
const village=readFileSync('assets/village/village.css','utf8');
const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');

test('Player Web uses visible viewport on Safari, Chrome and Edge iOS, not a scrolling document',()=>{
  assert.match(boot,/installGmwwPlayerViewport/);
  assert.match(boot,/const \$=\(s,r=document\).*\$\$=\(s,r=document\)/,'keep both DOM selector helpers intact');
  assert.match(boot,/window\.visualViewport/);
  assert.match(boot,/visualViewport\.addEventListener\('resize'/);
  assert.match(boot,/visualViewport\.addEventListener\('scroll'/);
  assert.match(boot,/orientationchange/);
  assert.match(boot,/--gmww-player-visible-height/);
  assert.match(boot,/body\{position:fixed!important;inset:0!important/);
  assert.match(boot,/html body #game\.screen\.active\{position:fixed!important/);
  assert.match(boot,/html body #gmwwVillageShell\{position:fixed!important/);
  assert.ok(gmwwMembersLiveScript.includes(boot),'The shipping script must include the viewport fix');
});
test('Embedded village fills its iframe exactly, without taller mobile vh units',()=>{
  assert.match(village,/html\.embedded \.game\{[^}]*height:100%;min-height:0!important/);
  assert.match(village,/html\.embedded \.stage\{[^}]*height:100%!important;min-height:0!important/);
  assert.doesNotMatch(village,/html\.embedded \.stage\{[^}]*100svh/);
});
test('Chat remains inside visible viewport during keyboard input; messages alone scroll',()=>{
  assert.match(boot,/#gmwwChatPanel\{[^']*gmww-player-visible-height/);
  assert.match(boot,/#gmwwChatPanel\{[^']*translateY\(-100%\)/);
  assert.match(boot,/#gmwwChatLines\{min-height:0!important;overflow-y:auto!important/);
  assert.match(boot,/#gmwwChatText\{font-size:16px!important/);
  assert.match(chat,/function gmwwChatClosePanel\(/);
  assert.match(chat,/getElementById\('gmwwChatPanel'\)\?\.contains\(target\)/);
  assert.match(boot,/#gmwwOnlineDock\{[^']*gmww-player-visible-height/);
  assert.match(boot,/#gmwwChatLaunch\{[^']*gmww-player-visible-height/);
});
