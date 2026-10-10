// Run against an isolated local Worker: node tests/worker-private-delivery-e2e.mjs
// Exercises real Durable Object persistence, authenticated member APIs, GM state,
// complete Role+Artifact receipts, reconnect, idempotency and republishing.
import assert from 'node:assert/strict';

const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
const serial=Date.now().toString(36);
async function req(path,{method='GET',body,token}={}){
 const response=await fetch(base+path,{
   method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
   body:body===undefined?undefined:JSON.stringify(body)
 });
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{throw new Error(method+' '+path+' non-JSON '+response.status+': '+text.slice(0,350))}
 return {status:response.status,data};
}
function expectOk(result,what){assert.ok(result.status>=200&&result.status<300&&result.data?.ok,what+': '+JSON.stringify(result));return result.data;}
const room=expectOk(await req('/api/rooms',{method:'POST',body:{roomName:'Receipt integration '+serial}}),'create room');
assert.ok(room.gmToken&&room.roomCode);
const code=room.roomCode,gmToken=room.gmToken;
const browsers=['safari','chrome','edge'],sessions=[];
for(const [index,browser] of browsers.entries()){
 const loginId='ci'+browser+serial;
 expectOk(await req('/api/members/register',{method:'POST',body:{loginId,displayName:'CI '+browser,gameCharacterId:'character-0'+(index+1)}}),'register '+browser);
 const login=expectOk(await req('/api/members/login',{method:'POST',body:{loginId,password:''}}),'login '+browser);
 assert.ok(login.token,'member session must have token');
 expectOk(await req('/api/rooms/'+code+'/join',{method:'POST',body:{token:login.token}}),'join '+browser);
 const before=expectOk(await req('/api/rooms/'+code+'/me',{token:login.token}),'predeal '+browser);
 assert.equal(before.role,null,'Role must not be leaked before GM deals');
 sessions.push({browser,loginId,token:login.token,index});
}
const matchId='match-ci-'+serial;
const assignments=sessions.map(({loginId,browser,index})=>({
 loginId,roleId:'role-test-'+index,roleName:'Vai '+browser,roleCard:{name:'Vai '+browser,faction:'Phe Dân',information:'Nội dung kiểm thử '+browser},
 ...(index!==2?{artifact:{artifactId:'artifact-test-'+index,artifactName:'Artifact '+browser,
   artifactCard:{name:'Artifact '+browser,information:'Artifact test '+browser},artworkAssetId:'artifact:artifact-test-'+index}}:{})
}));
const deal=expectOk(await req('/api/gm/rooms/'+code+'/assignments',{method:'POST',token:gmToken,body:{
 assignments,matchId,deliveryVersion:1,matchRevision:1,multiAssign:false
}}),'GM deals');
assert.equal(deal.assignments.length,3);
const deliveries=[];
for(const session of sessions){
 const {browser,index,token,loginId}=session;
 const privateResponse=expectOk(await req('/api/rooms/'+code+'/me',{token}),'private receipt '+browser);
 const {deliveryManifest:manifest,role,roles,artifact}=privateResponse;
 assert.equal(role.roleId,'role-test-'+index);
 assert.equal(roles.length,1);
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.complete,true);
 assert.equal(manifest.roleCount,1);
 assert.equal(manifest.artifactExpected,index!==2);
 assert.equal(artifact?.artifactId||null,index!==2?'artifact-test-'+index:null);
 assert.equal(manifest.receivedAt,null,'before ack');
 // Every signed-in account must receive its own private role, never another player's data.
 assert.notEqual(role.roleId,'role-test-'+((index+1)%3));
 // Wrong-version ACK cannot mark a card as received.
 const bad=await req('/api/rooms/'+code+'/delivery/received',{method:'POST',token,body:{
  deliveryId:manifest.deliveryId+'-stale',roleIds:manifest.roleIds,artifactId:manifest.artifactId
 }});
 assert.equal(bad.status,409,'server must reject stale confirmation '+browser);
 const ack=expectOk(await req('/api/rooms/'+code+'/delivery/received',{method:'POST',token,body:{
  deliveryId:manifest.deliveryId,roleIds:manifest.roleIds,artifactId:manifest.artifactId
 }}),'receipt ack '+browser);
 assert.ok(ack.receivedAt);
 const ackAgain=expectOk(await req('/api/rooms/'+code+'/delivery/received',{method:'POST',token,body:{
  deliveryId:manifest.deliveryId,roleIds:manifest.roleIds,artifactId:manifest.artifactId
 }}),'idempotent receipt '+browser);
 assert.equal(ackAgain.receivedAt,ack.receivedAt);
 const restored=expectOk(await req('/api/rooms/'+code+'/me',{token}),'resume '+browser);
 assert.equal(restored.deliveryManifest.receivedAt,ack.receivedAt);
 assert.equal(restored.role.roleId,role.roleId);
 assert.equal(restored.artifact?.artifactId||null,artifact?.artifactId||null);
 deliveries.push({session,manifest});
}
const gm=expectOk(await req('/api/gm/rooms/'+code,{token:gmToken}),'GM state');
assert.equal(gm.assignments.filter(a=>a.receivedAt).length,3,'GM received-at confirms 3/3');
const publicRoom=expectOk(await req('/api/rooms/'+code),'public room state');
assert.equal(JSON.stringify(publicRoom).includes('role-test-0'),false,'public room must not leak private role');
assert.equal(JSON.stringify(publicRoom).includes('artifact-test-0'),false,'public room must not leak private Artifact');
// Reissue the same match with a newer delivery, change one role and remove Artifact.
const reissue=assignments.map(a=>({...a,roleId:a.roleId+'-new'}));
delete reissue[0].artifact;
expectOk(await req('/api/gm/rooms/'+code+'/assignments',{method:'POST',token:gmToken,body:{
 assignments:reissue,matchId,deliveryVersion:2,matchRevision:2,multiAssign:false
}}),'GM reissue');
for(const {session,manifest:old} of deliveries){
 const receipt=expectOk(await req('/api/rooms/'+code+'/me',{token:session.token}),'refreshed receipt');
 assert.notEqual(receipt.deliveryManifest.deliveryId,old.deliveryId);
 assert.equal(receipt.deliveryManifest.receivedAt,null);
 assert.equal(receipt.deliveryManifest.complete,true);
 assert.equal(receipt.role.roleId,'role-test-'+session.index+'-new');
 if(session.index===0){assert.equal(receipt.deliveryManifest.artifactExpected,false);assert.equal(receipt.artifact,null)}
 const stale=await req('/api/rooms/'+code+'/delivery/received',{method:'POST',token:session.token,body:{
   deliveryId:old.deliveryId,roleIds:old.roleIds,artifactId:old.artifactId
 }});
 assert.equal(stale.status,409,'old match receipt cannot confirm reissue');
}
console.log(JSON.stringify({ok:true,roomCode:code,browsers,tested:[
 'isolated sessions','Role+Artifact bundle','no-Artifact bundle','complete receipt','missing version rejection',
 'reconnect','idempotent ack','GM counts','private data isolation','reissue invalidation'
]}));
