import test from 'node:test';
import assert from 'node:assert/strict';
import {isGMPlayerShareScope,isGMPlayerShareCIPolicyScope} from '../.github/scripts/gm-player-share-scope.mjs';

const baseline='<style></style>\n</head>\n        </div>\n        </div>\n<script src="app.js"></script>\n\n<script>existing</script>';
const style='\n<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->\n<style>\n#gmwwPlayerWebShareSettings{display:grid}\n</style>\n<!-- END GMWW_PLAYER_SHARE_STYLE -->\n';
const ui='        <!-- BEGIN GMWW_PLAYER_SHARE_UI -->\n        <section id="gmwwPlayerWebShareSettings"><input id="gmwwShareLegacy"><input id="gmwwShareAlias" value="alias" disabled><button id="gmwwShareCopy">Copy</button><button id="gmwwShareSend">Send</button></section>\n        <!-- END GMWW_PLAYER_SHARE_UI -->\n';
const script='\n\n<script>\n/* BEGIN GMWW_PLAYER_SHARE_SCRIPT */\nconst c=window.GMWW_PLAYER_WEB_ALIAS_CONFIG; if(!c||c.verified!==true){} if(parsed.protocol!==\'https:\'){} const key=\'GMWW_PLAYER_SHARE_LINK_CHOICE_V1\';\n/* END GMWW_PLAYER_SHARE_SCRIPT */\n</script>\n';
const changed=baseline
  .replace('\n</head>',style+'</head>')
  .replace('        </div>\n        </div>','        </div>\n'+ui+'        </div>')
  .replace('<script src="app.js"></script>','<script src="app.js"></script>'+script);
const feature=[
  {path:'server-game/current/GMWW.html',status:'M',before:baseline,after:changed},
  {path:'tests/gm-player-web-share-link.test.mjs',status:'A',after:'test verified HTTPS alias'},
  {path:'.github/workflows/check-gm-player-link-share.yml',status:'A',after:'run: node --test tests/gm-player-web-share-link.test.mjs'}
];

test('GM Player share only is classified after exact HTML reverse patch',()=>{
  assert.equal(isGMPlayerShareScope(feature),true);
});
test('fail-closed: game markup, routing, duplicate markers, moved content and extra files are not scoped',()=>{
  const mutate=s=>feature.map(x=>x.path==='server-game/current/GMWW.html'?{...x,after:s}:x);
  assert.equal(isGMPlayerShareScope(mutate(changed.replace('existing</script>','modified!</script>'))),false);
  assert.equal(isGMPlayerShareScope(mutate(changed+'<div>another menu</div>')),false);
  assert.equal(isGMPlayerShareScope(mutate(changed.replace(' disabled',''))),false);
  assert.equal(isGMPlayerShareScope(mutate(changed.replace('https:', 'http:'))),false);
  assert.equal(isGMPlayerShareScope(mutate(changed.replace('GMWW_PLAYER_WEB_ALIAS_CONFIG','fetch(\"/api/delete\")'))),false);
  assert.equal(isGMPlayerShareScope(mutate(changed+'<!-- BEGIN GMWW_PLAYER_SHARE_UI -->')),false);
  assert.equal(isGMPlayerShareScope([...feature,{path:'src/index.js',status:'M',before:'old',after:'new'}]),false);
  assert.equal(isGMPlayerShareScope(feature.filter(x=>x.path!=='tests/gm-player-web-share-link.test.mjs')),false);
  assert.equal(isGMPlayerShareScope(feature.map(x=>x.path==='server-game/current/GMWW.html'?{...x,status:'D'}:x)),false);
});
test('fail-closed: no unknown workflow or test change can masquerade as share feature',()=>{
  const x=feature.map(row=>row.path.endsWith('test.mjs')?{...row,path:'tests/other.test.mjs'}:row);
  assert.equal(isGMPlayerShareScope(x),false);
  assert.equal(isGMPlayerShareCIPolicyScope(feature),false);
});
