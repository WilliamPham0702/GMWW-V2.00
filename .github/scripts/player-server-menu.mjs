// Player consumes the actual GM menu markup and its stylesheet rules at build time.
// Keep media queries and rule order; never maintain a second set of labels/skin.
import fs from 'node:fs';
import path from 'node:path';
export function playerServerMenuBundle(root){
 const html=fs.readFileSync(path.join(root,'server-game/current/GMWW.html'),'utf8');
 const setup=html.match(/<section\b[^>]*id="playSetupStrip"[^>]*>[\s\S]*?<\/section>/)?.[0];
 const battle=html.match(/<section\b[^>]*id="playBattleTop"[^>]*>[\s\S]*?<\/section>/)?.[0];
 const dock=html.match(/<nav\b[^>]*id="gmTopMenu"[^>]*>[\s\S]*?<\/nav>/)?.[0];
 const markup=setup+battle;
 if(!setup||!battle||!dock)throw Error('Missing authoritative GM top menu');
 const source=fs.readFileSync(path.join(root,'server-game/current/style.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 function select(css){
  let out='',start=0;
  while(start<css.length){
   const open=css.indexOf('{',start);if(open<0)break;
   let end=open+1,depth=1;for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;else if(css[end]==='}')depth--}
   const head=css.slice(start,open).trim(),body=css.slice(open+1,end-1);start=end;
   if(/^@(media|supports|layer)\b/.test(head)){const inner=select(body);if(inner)out+=head+'{'+inner+'}\n';continue}
   if(head.startsWith('@'))continue;
   if(/#gmTopMenu|gm-top-menu-v293|gm-bottom-menu-v325|gm-stage-dock-v330|gm-top-box-v293|gm-top-small-v293|gm-top-info|gm-top-icon|gm-top-auto|gm-top-audio|gm-step-forward-icon|play-exit-top|play-end-top|#playPhasePill|#playAutoGM|#playAudioTop|#playEndGame|#playExitVillage|#playSetupStrip|\.play-setup-strip|#playBattleTop|#battleTimeline|\.play-battle-(?:top|timeline|step)|\.battle-step-num/.test(head))out+=head.replaceAll('body.play-immersive',':host')+'{'+body+'}\n';
  }
  return out;
 }
 const vars=[...source.matchAll(/--gmww-stage-[\w-]+\s*:[^;{}]+;/g)].map(m=>m[0]).join('');
 return {markup,dock,css:':host{'+vars+'}'+select(source)};
}
