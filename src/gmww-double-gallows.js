// Thẩm Phán / Bùa Tai Ương share the same bounded, match-local ballot rule.
export function armDoubleGallows(ballot,source){
 if(!ballot||ballot.stage!=='ready'||Number(ballot.round||1)!==1)
  return {ok:false,error:'DOUBLE_GALLOWS_TOO_LATE'};
 if(ballot.extraRoundPending)return {ok:false,error:'DOUBLE_GALLOWS_ALREADY_ARMED'};
 if(!source?.actorId||!(source.roleId==='role_judge'&&!source.artifactId||source.artifactId==='artifact_41'))
  return {ok:false,error:'DOUBLE_GALLOWS_INVALID_SOURCE'};
 return {ok:true,value:{...ballot,round:1,extraRoundPending:true,
  extraRoundSource:{actorId:source.actorId,roleId:source.roleId||'',artifactId:source.artifactId||''}}};
}
export function nextDoubleGallows(ballot,id,now){
 if(ballot?.stage!=='resolved'||!ballot.extraRoundPending||Number(ballot.round||1)!==1)return null;
 return {...ballot,id,round:2,extraRoundPending:false,previousBallotId:ballot.id,
  stage:'ready',candidateId:null,nominations:{},votes:{},eligible:[],outcome:null,
  nominationStartedAt:null,nominationDeadlineAt:null,hangingStartedAt:null,
  startedAt:null,deadlineAt:null,resolvedAt:null,acknowledgedAt:null,updatedAt:now};
}
