// Hồn Ma: exactly one clue word per Day, moderated by GM.
// No names may appear in the public clue; violations permanently remove the
// Ghost's right to send further messages for this match.
const fold=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function validateGhostClue({text,playerNames=[]}={}){
 const value=String(text??'').trim().normalize('NFC');
 if(!value||value.length>40||!/^[\p{L}\p{M}]+$/u.test(value))
   return {ok:false,error:'GHOST_ONE_WORD_ONLY'};
 const key=fold(value);
 if((Array.isArray(playerNames)?playerNames:[]).some(name=>
   String(name||'').trim()&&fold(String(name).trim())===key))
   return {ok:false,error:'GHOST_PLAYER_NAME_FORBIDDEN',ban:true};
 return {ok:true,text:value};
}
export function ghostClueAllowed({phase,cyclePhase,roleId,dead,expelled,previous,ban}={}){
 if(phase!=='running'||cyclePhase!=='morning')return {ok:false,error:'GHOST_DAY_ONLY'};
 if(roleId!=='role_ghost')return {ok:false,error:'GHOST_ROLE_REQUIRED'};
 if(!dead||expelled)return {ok:false,error:'GHOST_MUST_BE_DEAD'};
 if(ban)return {ok:false,error:'GHOST_BANNED_FOR_MATCH'};
 if(previous)return {ok:false,error:'GHOST_ALREADY_SENT_TODAY'};
 return {ok:true};
}
export function moderateGhostClue({clue,decision,violation=false}={}){
 if(!clue||clue.status!=='pending'||!['approve','reject'].includes(decision))
   return {ok:false,error:'GHOST_MODERATION_INVALID'};
 return {ok:true,clue:{...clue,status:decision==='approve'?'approved':'rejected',
   ruleViolation:violation===true},ban:decision==='reject'&&violation===true};
}
