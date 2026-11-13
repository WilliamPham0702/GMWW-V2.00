import {gmSource,playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const cases=[
 {name:'GM',read:()=>gmSource('45-online-chat'),fn:'gmwwGMVoiceCancel',prefix:'gmwwGMVoice',form:'gmwwGMChatVillage',button:'gmwwGMChatDiscard',reset:'gmwwGMVoiceButtonReset',display:'gmwwGMVoiceRecording'},
 {name:'Player',read:()=>playerWebSource('35-online-chat'),fn:'gmwwChatVoiceCancel',prefix:'gmwwChatVoice',form:'gmwwChatForm',button:'gmwwChatDiscard',reset:'gmwwChatVoiceReset',display:'gmwwChatRecordDisplay'}
];

for(const c of cases){
 const source=c.read();
 const start=source.indexOf('function '+c.fn+'(){');
 const end=source.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start,'cancel function exists');
 const cancel=source.slice(start,end+2);
 test(c.name+' shows trash only for active/unsent audio, with a connected handler',()=>{
  assert.ok(source.includes('id="'+c.button+'" aria-label="Hủy bản ghi thoại"'));
  assert.ok(source.includes('#'+c.form+'.is-recording #'+c.button+'{display:grid}'));
  assert.ok(source.includes("getElementById('"+c.button+"').onclick="+c.fn));
 });
 test(c.name+' cancels recording/draft locally, never uploads audio',()=>{
  assert.doesNotMatch(cancel,/\b(?:api|playRoomApi)\s*\(/);
  assert.ok(source.includes('recordingGeneration!=='+c.prefix+'Generation'));
  for(const recording of [true,false]){
   const p=c.prefix;
   const recorder=recording?"{state:'recording',stop(){stops++}}":"null";
   const setup='let '+p+'Busy=false,'+p+'Generation=1,'+p+'Discard=false,'+p+'PendingSend=true,'+p+"Draft={voice:{base64:'TEST'}},"+p+'Recorder='+recorder+','+p+'Processing=false;let stops=0,resets=0,display=0;function '+c.display+'(){display++}function '+c.reset+'(){resets++}';
   const result=vm.runInNewContext(setup+cancel+'\n'+c.fn+'();({generation:'+p+'Generation,discard:'+p+'Discard,pending:'+p+'PendingSend,draft:'+p+'Draft,stops,resets,display})');
   assert.equal(result.generation,2);
   assert.equal(result.discard,true);
   assert.equal(result.pending,false);
   assert.equal(result.draft,null);
   assert.equal(result.stops,recording?1:0);
   assert.equal(result.resets,recording?0:1);
  }
 });
 test(c.name+' prevents a stale encoder from restoring a canceled voice draft',()=>{
  assert.match(source,/recordingGeneration!==gmww(?:GM|Chat)VoiceGeneration/);
  assert.match(source,/if\(gmww(?:GM|Chat)VoiceDiscard\|\|recordingGeneration!==gmww(?:GM|Chat)VoiceGeneration\)return;\s+gmww/);
 });
}
