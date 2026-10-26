import test from 'node:test';
import assert from 'node:assert/strict';
import {isIconArtworkScope,isIconArtworkPolicyScope} from '../.github/scripts/icon-artwork-scope.mjs';
const item=(path,before,after,status=before===null?'A':'M')=>({path,before,after,status});
const pictureOld="function picture(icon){return icon.image||(icon.assetId?'action-icons/v2/'+encodeURIComponent(icon.assetId):'fallback')}";
const pictureNew="function picture(icon){return icon.image||(icon.assetId?'action-icons/v3/'+encodeURIComponent(icon.assetId.replace(/\\.png$/,'.webp')):'fallback')}";
const base=()=>[
 item('assets/action-icons/v3/01_soi_xet.webp',null,'binary'),
 item('assets/action-icons/v3/manifest.json',null,'{}'),
 item('server-game/current/action-icons/v3/01_soi_xet.webp',null,'binary'),
 item('server-game/current/action-icon-library.js','const DEFAULT=[1];\n'+pictureOld+'\nfunction auditCatalog(){}','const DEFAULT=[1];\n'+pictureNew+'\nfunction auditCatalog(){}'),
 item('src/index.js','const VERSION="V3.233",UPDATE_CHANNEL_REV="runtime-3233";\nkeep();','const VERSION="V3.234",UPDATE_CHANNEL_REV="runtime-3234";\nkeep();'),
 item('package.json','{"version":"3.233.0","private":true}','{"version":"3.234.0","private":true}'),
];
test('artwork and metadata-only release receives focused scope',()=>assert.equal(isIconArtworkScope(base()),true));
test('Worker behavior changes cannot hide behind a version bump',()=>{const rows=base();rows[4].after+='\nchangeRules();';assert.equal(isIconArtworkScope(rows),false)});
test('catalog mapping mutation cannot hide behind picture function',()=>{const rows=base();rows[3].after=rows[3].after.replace('[1]','[2]');assert.equal(isIconArtworkScope(rows),false)});
test('dependency changes fail closed',()=>{const rows=base();rows[5].after='{"version":"3.234.0","private":false}';assert.equal(isIconArtworkScope(rows),false)});
test('unknown file, deletion, empty change list and missing picture switch fail closed',()=>{
 assert.equal(isIconArtworkScope([]),false);
 assert.equal(isIconArtworkScope([...base(),item('src/gmww-rules.js',null,'rules')]),false);
 const rows=base();rows[0].status='D';assert.equal(isIconArtworkScope(rows),false);
 assert.equal(isIconArtworkScope(base().filter(x=>!x.path.endsWith('action-icon-library.js'))),false);
});
test('rotation image replaces emoji visual without changing event routing',()=>{
 const before="const VERSION='3.233';\nfunction battleIconResolve(action){\n return [{id:'yeu-tinh-xoay',name:'Yêu Tinh',assetId:'',image:'',isRotation:true}];\n}\nfunction battleIconPositionKey(){}\n  const visual=icon.isRotation?'<span class=\"gmww-icon-rotation\" aria-hidden=\"true\">🔄</span>':\n    '<img draggable=\"false\" src=\"'+playEsc(api.image(icon))+'\" alt=\"\">';\nkeep();";
 const after=before.replace('3.233','3.234').replace("assetId:'',image:'',isRotation:true","assetId:'50_yeu_tinh_xoay.png',image:'',isRotation:true").replace("const visual=icon.isRotation?'<span class=\"gmww-icon-rotation\" aria-hidden=\"true\">🔄</span>':\n    ","const visual=");
 assert.equal(isIconArtworkScope([...base(),item('server-game/current/app.js',before,after)]),true);
 assert.equal(isIconArtworkScope([...base(),item('server-game/current/app.js',before,after.replace('keep();','submit();'))]),false);
});
test('CI-only policy does not allow product files',()=>{
 const rows=['.github/scripts/icon-artwork-scope.mjs','.github/scripts/ci-browser-scope.mjs','tests/icon-artwork-ci.test.mjs'].map(p=>item(p,null,''));
 assert.equal(isIconArtworkPolicyScope(rows),true);
 assert.equal(isIconArtworkPolicyScope([...rows,item('src/index.js',null,'')]),false);
});

import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
test('selector routes artwork without changing legacy unknown-diff behavior',()=>{assert.equal(classifyBrowserScope(base()),'icon-artwork');assert.equal(classifyBrowserScope([item('src/index.js','before','gameplay')]),'full')});
test('picture helper cannot hide data deletion or executable code between functions',()=>{
 const rows=base();rows[3].after=rows[3].after.replace('\nfunction auditCatalog()', '\nlocalStorage.clear();\nfunction auditCatalog()');
 assert.equal(isIconArtworkScope(rows),false);
 const body=base();body[3].after=body[3].after.replace('return icon.image','localStorage.clear();return icon.image');
 assert.equal(isIconArtworkScope(body),false);
});
