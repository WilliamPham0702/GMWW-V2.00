// Khăn Hồn Ma (#34): the recipient of a request must have been eliminated
// in the preceding cycle. Exactly one letter is returned to the owner only.
const clean=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
export function ghostLetterTarget({actorId,targetId,matchId,day,interactions=[]}={}){
 const actor=clean(actorId),target=clean(targetId),previous=Number(day)-1;
 if(!actor||!target||actor===target||!Number.isInteger(previous)||previous<1)
  return {ok:false,error:'GHOST_LETTER_PREVIOUS_DAY_REQUIRED'};
 const dead=(Array.isArray(interactions)?interactions:[]).some(row=>
  clean(row.loginId)===target&&row.type==='dead'&&row.effectActive!==false&&
  String(row.matchId||'')===String(matchId||'')&&Number(row.night)===previous);
 return dead?{ok:true,targetId:target}:
  {ok:false,error:'GHOST_LETTER_PREVIOUS_DAY_REQUIRED'};
}
export function ghostLetterContent(value){
 const text=String(value??'').trim().normalize('NFC');
 return /^[\p{L}][\p{M}]*$/u.test(text)?
   {ok:true,letter:text}:{ok:false,error:'GHOST_LETTER_ONE_CHARACTER_REQUIRED'};
}
export function ghostLetterResponse({request,loginId,matchId,letter}={}){
 if(!request||request.status!=='pending'||
  clean(request.targetId)!==clean(loginId)||
  String(request.matchId||'')!==String(matchId||''))
  return {ok:false,error:'GHOST_LETTER_REQUEST_NOT_ACTIVE'};
 const checked=ghostLetterContent(letter);
 if(!checked.ok)return checked;
 return {ok:true,request:{...request,status:'responded',letter:checked.letter}};
}
