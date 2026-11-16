import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packageGmwwAudioPack} from '../scripts/audio/package-gmww-audio.mjs';
const bytes=Buffer.from('49443303000000000000','hex'),row={target:'system:audio_system_day_wakeup',mime:'audio/mpeg',size:bytes.length,base64:bytes.toString('base64')};
const pack=clips=>({format:'gmww-audio-pack-v1',clips});
test('verified content-addressed GitHub audio, no GMWW user data',()=>{
 const {files,manifest}=packageGmwwAudioPack(pack([row]));
 const hash=createHash('sha256').update(bytes).digest('hex');
 assert.equal(files.size,1);assert.equal(manifest.clips[row.target].sha256,hash);
 assert.match(manifest.clips[row.target].url,new RegExp('releases/download/gmww-audio-v1/'+hash+'\\.mp3$'));
 assert.deepEqual(Object.keys(manifest),['format','version','releaseTag','clips']);
 assert.doesNotMatch(JSON.stringify(manifest),/GMWW_V258_STATE|ownerToken|password/);
});
test('one binary can back multiple role and system targets',()=>{
 const {files,manifest}=packageGmwwAudioPack(pack([row,{...row,target:'cards:role_witch'}]));
 assert.equal(files.size,1);assert.equal(Object.keys(manifest.clips).length,2);
});
test('refuse invalid paths, duplicates and malicious release tags',()=>{
 for(const target of ['../../auth','system:role/../../','cards:','https://evil.example/audio'])assert.throws(()=>packageGmwwAudioPack(pack([{...row,target}])));
 assert.throws(()=>packageGmwwAudioPack(pack([row,row])));
 assert.throws(()=>packageGmwwAudioPack(pack([row]),{tag:'../latest'}));
});
test('refuse spoofed media, invalid lengths, and full device backups',()=>{
 for(const bad of [{...row,mime:'audio/ogg'},{...row,size:17},{...row,base64:Buffer.from('not audio').toString('base64'),size:9}])assert.throws(()=>packageGmwwAudioPack(pack([bad])));
 assert.throws(()=>packageGmwwAudioPack({schema:'gmww-save-v1',localStorage:{GMWW_V258_STATE:'secret'},indexedDB:[]}));
});
