// GĐ12: procedural, low-power 3D-only sound effects; NOT synthesized role-name voice.
// Audio is opt-in via user gesture. No audio URLs or secret Core metadata exposed.
export const STAGE12_VERSION='gmww.arena.opt-in-sound.12';
const notes={
 wolf:[110,82,64],oracle:[520,660,790],wand:[620,930,740],
 shield:[340,440,540],heal:[440,554,659],attack:[186,95,77],
 vote:[523,392],scout:[420,560,620],curse:[220,165,125]
};
export const ARENA_SOUND_FAMILIES=Object.freeze(Object.keys(notes));
export const arenaSoundNotes=family=>Object.freeze([...(notes[family]||notes.vote)]);
export function createArenaAudioEngine(AudioContextCtor,{maxVolume=.035}={}){
 let ctx=null,enabled=false;
 const played=new Map(),gainCap=Math.min(.06,Math.max(0,Number(maxVolume)||0));
 function enableFromGesture(){
  if(!AudioContextCtor)return false;
  if(!ctx)try{ctx=new AudioContextCtor()}catch{return false}
  if(ctx.state==='suspended')void ctx.resume?.().catch?.(()=>{});
  enabled=true;return true;
 }
 function stop(){
  enabled=false;played.clear();
  if(ctx){void ctx.close?.().catch?.(()=>{});ctx=null}
 }
 function play(profile,key){
  if(!enabled||!ctx||typeof key!=='string'||!key||!profile?.family)return false;
  // De-duplicate HTTP polling, WebSocket reconnect and redundant GM turns.
  if(played.has(key))return false;
  if(played.size>48)played.delete(played.keys().next().value);
  played.set(key,true);
  const tones=arenaSoundNotes(profile.family).slice(0,3);
  try{
   const t=ctx.currentTime;
   for(let i=0;i<tones.length;i++){
    const oscillator=ctx.createOscillator(),volume=ctx.createGain();
    oscillator.type=profile.family==='wolf'||profile.family==='attack'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(tones[i],t+i*.095);
    volume.gain.setValueAtTime(0,t+i*.095);
    volume.gain.linearRampToValueAtTime(gainCap/(i+1),t+i*.095+.025);
    volume.gain.exponentialRampToValueAtTime(.0001,t+i*.095+.28);
    oscillator.connect(volume);volume.connect(ctx.destination);
    oscillator.start(t+i*.095);oscillator.stop(t+i*.095+.30);
   }
   return true;
  }catch{return false}
 }
 return Object.freeze({enableFromGesture,stop,play,get enabled(){return enabled},get playedCount(){return played.size}});
}
