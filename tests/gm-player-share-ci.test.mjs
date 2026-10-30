import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const before='<head>\n</head>\n<body>\n        </div>\n<script src="app.js"></script>\n\n<script>\nold()\n</script>';
const after=before.replace('\n</head>','\n\n<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->\n<style>share{}</style>\n<!-- END GMWW_PLAYER_SHARE_STYLE -->\n</head>').replace('        </div>','        <!-- BEGIN GMWW_PLAYER_SHARE_UI -->\n<section>share</section>\n        <!-- END GMWW_PLAYER_SHARE_UI -->\n        </div>').replace('\n<script>\nold()', '\n<script>\n/* BEGIN GMWW_PLAYER_SHARE_SCRIPT */\nshare()\n/* END GMWW_PLAYER_SHARE_SCRIPT */\n</script>\n\n\n<script>\nold()');
const feature=[{path:'server-game/current/GMWW.html',status:'M',before,after},{path:'tests/gm-player-web-share-link.test.mjs',status:'A',before:null,after:'test'}];
test('share-only HTML additions select focused checks',()=>assert.equal(classifyBrowserScope(feature),'gm-player-share'));
test('share scope rejects changed login, backend, unknown file, deleted or duplicate markers',()=>{
 for(const changed of [after.replace('old()','loginChanged()'),after.replace('END GMWW_PLAYER_SHARE_UI','broken'),after+'\n<!-- BEGIN GMWW_PLAYER_SHARE_UI -->'])assert.notEqual(classifyBrowserScope([{...feature[0],after:changed},feature[1]]),'gm-player-share');
 for(const path of ['src/index.js','server-game/current/app.js','unknown.js'])assert.notEqual(classifyBrowserScope([...feature,{path,status:'M',before:'a',after:'b'}]),'gm-player-share');
 assert.notEqual(classifyBrowserScope([{...feature[0],status:'D'}]),'gm-player-share');
});

import {sharePolicyPaths} from '../.github/scripts/gm-player-share-scope.mjs';
import {readFileSync} from 'node:fs';
test('separate CI policy selects verification without changing application files',()=>{
 const changes=[...sharePolicyPaths].map(path=>({path,status:'M',before:'old',after:'new'}));
 assert.equal(classifyBrowserScope(changes),'gm-player-share-ci');
 assert.notEqual(classifyBrowserScope([...changes,{path:'src/index.js',status:'M',before:'old',after:'new'}]),'gm-player-share-ci');
});
test('both automatic publication channels block the share feature and its policy',()=>{
 const production=readFileSync('.github/workflows/deploy-production.yml','utf8');
 const github=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
 assert.match(production,/gm-player-share \|[\s\S]*gm-player-share-ci \|[\s\S]*SHOULD_DEPLOY=false/);
 assert.match(github,/needs: release-scope/);
 assert.match(github,/needs.release-scope.outputs.allowed == 'true'/);
 assert.match(github,/gm-player-share \|[\s\S]*gm-player-share-ci \|[^\n]*allowed=false/);
});
