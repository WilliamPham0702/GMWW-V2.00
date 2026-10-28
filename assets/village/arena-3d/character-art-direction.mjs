// GMWW Arena 3D GĐ6 — maritime anime/chibi art bible.
// Public character ID only. These 40 looks contain no role, faction or secret data.
// Procedural art-direction profiles (not independent sculpted GLB/FBX models).
const CLOTH=Object.freeze(['#13a7b1','#75b7df','#f8c979','#bfa6ef','#8bd2b1','#f5aebd','#94b8f7','#ead7a8']);
const HAIR=Object.freeze(['#285578','#6b4b73','#3d716c','#9c644c','#465f98','#563e68','#79614b','#436872']);
const SKIN=Object.freeze(['#f9d8bd','#f2c6a9','#eac0a1','#f6d1b8','#e5b191']);
const TRIM=Object.freeze(['#fef1c5','#9bf3e6','#e7dbff','#fff9ed','#ddf6f2']);
const ACCENT=Object.freeze(['#f4de96','#a6f3ee','#e3bbfa','#ffcddd','#ffedd1']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const CHARACTER_ART_VERSION='gmww.arena.art.sea-chibi.6';
export const CHARACTER_ART_COUNT=40;
export function characterArtProfile(characterId){
  const match=String(characterId||'').match(/(\d+)$/);
  const raw=match?Number(match[1]):1;
  const index=Number.isSafeInteger(raw)&&raw>0?((raw-1)%CHARACTER_ART_COUNT):0;
  const silhouette=Math.floor(index/8);  // 5 independent costumes/hairstyle combinations
  const palette=index%8;                 // 8 sea/fantasy colour stories
  return Object.freeze({
    id:'character-'+String(index+1).padStart(2,'0'),
    cloth:CLOTH[palette],
    hair:HAIR[(palette+silhouette*3)%HAIR.length],
    skin:SKIN[(palette+silhouette)%SKIN.length],
    accessory:ACCENT[silhouette],
    trim:TRIM[(silhouette+palette)%TRIM.length],
    style:silhouette,               // backward-compatible atelier variants
    silhouette, palette,
    hairHeight:1+((palette%3)-1)*.07,
    headScale:1+((palette%4)-1.5)*.035,
    eyeScale:.93+(palette%3)*.055,
    outfitWidth:.96+(palette%4)*.03,
    skirtLength:.95+(palette%3)*.04,
    badgeSide:palette%2===0?'left':'right',
    expression:palette%3,          // shape only, never inferred from role or team
    signature:`sea-chibi-${String(index+1).padStart(2,'0')}-s${silhouette}-p${palette}`
  });
}
export function accessoryPartVisible(part,profile){
  const style=profile?.silhouette??0;
  if(part==='shellpin')return style===1||style===4;
  if(part==='ribbon')return style===0||style===3;
  if(part==='cape')return style===2||style===4;
  if(part==='hairTail')return style===1||style===3;
  if(part==='shellCrown')return style===2||style===4;
  return true;
}
// Ritual motion is render-only; no change to authoritative seat or animation timeline.
export function characterMotionFrame({time=0,index=0,moving=false,casting=false,standing=false,reducedMotion=false}={}){
  if(reducedMotion)return {headTilt:0,armLift:casting?.12:0,capeSway:0,step:0,robeSway:0,breath:0};
  const phase=time*.010+index*.87;
  return {
    headTilt:Math.sin(phase*.54)*.024+(casting?.038:0),
    armLift:casting?.29+.12*Math.sin(time*.016):moving?.045+.08*Math.sin(phase):.024*Math.sin(phase*.6),
    capeSway:(moving?.065:.025)*Math.sin(phase*.75),
    step:moving?.075*Math.abs(Math.sin(phase)):0,
    robeSway:standing?.035*Math.sin(phase*.65):.012*Math.sin(phase*.4),
    breath:.018*Math.sin(time*.0028+index)
  };
}
export const clampArtScale=(value)=>clamp(Number(value)||1,.65,1.45);
